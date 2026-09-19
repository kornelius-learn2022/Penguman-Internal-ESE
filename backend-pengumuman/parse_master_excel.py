import zipfile
import xml.etree.ElementTree as ET
import re
import os
import csv

def col_to_num(col_str):
    num = 0
    for c in col_str:
        num = num * 26 + (ord(c) - ord('A') + 1)
    return num

def num_to_col(n):
    res = ''
    while n > 0:
        n, rem = divmod(n - 1, 26)
        res = chr(65 + rem) + res
    return res

def parse_excel_schedules(xlsx_path):
    with zipfile.ZipFile(xlsx_path, 'r') as z:
        shared_strings = []
        tree = ET.fromstring(z.read('xl/sharedStrings.xml'))
        ns = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
        for si in tree.findall('s:si', ns):
            runs = si.findall('.//s:t', ns)
            shared_strings.append(''.join([r.text for r in runs if r.text]))

        wb_tree = ET.fromstring(z.read('xl/workbook.xml'))
        sheet_names = [s.attrib['name'] for s in wb_tree.findall('.//s:sheet', ns)]

        all_records = []

        for s_idx, s_name in enumerate(sheet_names, start=1):
            s_tree = ET.fromstring(z.read(f'xl/worksheets/sheet{s_idx}.xml'))
            
            # 1. Parse merged cells
            merges = {}
            for m in s_tree.findall('.//s:mergeCell', ns):
                ref = m.attrib.get('ref')
                start, end = ref.split(':')
                start_col = ''.join([c for c in start if c.isalpha()])
                start_row = int(''.join([c for c in start if c.isdigit()]))
                end_col = ''.join([c for c in end if c.isalpha()])
                end_row = int(''.join([c for c in end if c.isdigit()]))
                for c_n in range(col_to_num(start_col), col_to_num(end_col) + 1):
                    for r_n in range(start_row, end_row + 1):
                        merges[(num_to_col(c_n), r_n)] = (start_col, start_row)

            # 2. Parse raw cells
            raw_cells = {}
            for r in s_tree.findall('.//s:row', ns):
                r_num = int(r.attrib.get('r'))
                for c in r.findall('s:c', ns):
                    c_ref = c.attrib.get('r')
                    col_letter = ''.join([ch for ch in c_ref if ch.isalpha()])
                    t = c.attrib.get('t')
                    v = c.find('s:v', ns)
                    val = v.text if v is not None else ''
                    if t == 's' and val.isdigit():
                        val = shared_strings[int(val)]
                    if val:
                        raw_cells[(col_letter, r_num)] = val.strip()

            # Unmerge: duplicate master cell value to all merged positions
            cell_values = {}
            for pos, val in raw_cells.items():
                cell_values[pos] = val
            for (col, r_num), (master_col, master_r) in merges.items():
                if (master_col, master_r) in raw_cells:
                    cell_values[(col, r_num)] = raw_cells[(master_col, master_r)]

            # 3. Find header rows
            rows = s_tree.findall('.//s:row', ns)
            r_nums = sorted([int(r.attrib.get('r')) for r in rows])
            header_rows = []
            for r_num in r_nums:
                row_vals = [cell_values.get((num_to_col(c), r_num), '') for c in range(1, 10)]
                if 'Time' in row_vals and 'Monday' in row_vals:
                    header_rows.append(r_num)

            for i, h_row in enumerate(header_rows):
                # Title is above h_row
                title = ''
                for prev_r in range(h_row - 1, max(0, h_row - 4), -1):
                    for col_c in ['A', 'B', 'C', 'D']:
                        t_cand = cell_values.get((col_c, prev_r), '')
                        if t_cand and any(kw in t_cand for kw in ['Grade', 'Mr.', 'Ms.', 'Library', 'Team']):
                            title = t_cand
                            break
                    if title:
                        break

                subject_grade = title
                teacher_name = title
                m_teacher = re.search(r'\((.*?)\)', title)
                if m_teacher:
                    teacher_name = m_teacher.group(1).strip()
                    subject_grade = re.sub(r'\(.*?\)', '', title).strip()
                else:
                    if 'Library' in title:
                        teacher_name = 'Library Team'
                        subject_grade = title.strip()

                time_cols = []
                day_cols = {}
                for col_n in range(1, 12):
                    c_let = num_to_col(col_n)
                    h_val = cell_values.get((c_let, h_row), '')
                    if h_val == 'Time':
                        time_cols.append(c_let)
                    elif h_val in ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']:
                        day_cols[h_val] = c_let

                time1_col = time_cols[0] if time_cols else 'A'
                time2_col = time_cols[1] if len(time_cols) > 1 else None

                next_h_row = header_rows[i+1] if i+1 < len(header_rows) else max(r_nums) + 1

                for cur_r in range(h_row + 1, next_h_row):
                    t1 = cell_values.get((time1_col, cur_r), '')
                    t2 = cell_values.get((time2_col, cur_r), '') if time2_col else ''
                    
                    # Pastikan row ini benar-benar memiliki format waktu jam (contoh: 08.00-08.35)
                    has_time1 = bool(re.search(r'\d{1,2}[\.:]\d{2}', t1))
                    has_time2 = bool(re.search(r'\d{1,2}[\.:]\d{2}', t2))
                    if not has_time1 and not has_time2:
                        continue

                    for day_name in ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']:
                        if day_name not in day_cols:
                            continue
                        d_col = day_cols[day_name]
                        c_val = cell_values.get((d_col, cur_r), '')
                        if not c_val:
                            continue

                        # ATURAN USER:
                        # "untuk time berikan time 1 dan time 2 -> time dua akan dipakai hari setelahnya kalau setelah itu akan menggunakan time 1"
                        # Jika Time 2 di Col D: hari setelahnya adalah Wednesday -> Wednesday pakai Time 2. Hari lainnya pakai Time 1.
                        # Jika Time 2 di Col E: hari setelahnya adalah Thursday -> Thursday pakai Time 2. Hari lainnya pakai Time 1.
                        use_time2 = False
                        if time2_col == 'D' and day_name == 'Wednesday':
                            use_time2 = True
                        elif time2_col == 'E' and day_name == 'Thursday':
                            use_time2 = True

                        chosen_time = (t2 if (use_time2 and t2) else t1) or t1 or t2
                        note_val = 'Time 2' if use_time2 else 'Time 1'

                        all_records.append({
                            'subject_grade': subject_grade,
                            'teacher_name': teacher_name,
                            'day_of_week': day_name,
                            'time_slot': chosen_time,
                            'class_name': c_val,
                            'note': note_val
                        })

    return all_records

if __name__ == '__main__':
    xlsx_file = r'C:\Users\kornelius\.gemini\antigravity\brain\79e39246-4ff8-4acb-bdbc-89281cb5a1a0\.user_uploaded\media_1789727760298.xlsx'
    records = parse_excel_schedules(xlsx_file)
    print(f'Extracted total unmerged records: {len(records)}')

    kornel = [r for r in records if 'Kornelius' in r['teacher_name']]
    print(f'\n=== Mr. Kornelius ({len(kornel)} records) ===')
    for day in ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']:
        d_recs = [r for r in kornel if r['day_of_week'] == day]
        print(f'[{day}] ({len(d_recs)} slots):')
        for r in d_recs:
            print(f'  {r["time_slot"]} ({r["note"]}) -> {r["class_name"]}')

    adhik = [r for r in records if 'Adhik' in r['teacher_name']]
    print(f'\n=== Mr. Adhik ({len(adhik)} records) ===')
    for day in ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']:
        d_recs = [r for r in adhik if r['day_of_week'] == day]
        print(f'[{day}] ({len(d_recs)} slots):')
        for r in d_recs:
            print(f'  {r["time_slot"]} ({r["note"]}) -> {r["class_name"]}')
