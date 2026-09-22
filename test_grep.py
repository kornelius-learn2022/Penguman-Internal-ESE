import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('202.155.14.105', username='root', password='Lius_20071997', timeout=10)
stdin, stdout, stderr = client.exec_command("grep -o 'absen-duty' /var/www/pengumuman-internal/pengumuman/pengumuman-ese-new/frontend-pengumuman/dist/assets/*.js")
print(stdout.read().decode('utf-8', errors='ignore'))
client.close()
