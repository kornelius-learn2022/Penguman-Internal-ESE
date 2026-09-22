import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('202.155.14.105', username='root', password='Lius_20071997', timeout=10)

commands = [
    "mysql -u admin_web -p'PasswordKuat123!' -h 127.0.0.1 db_pengumuman -e \"ALTER TABLE Announcements ADD COLUMN is_pinned BOOLEAN NOT NULL DEFAULT 0;\"",
    "mysql -u admin_web -p'PasswordKuat123!' -h 127.0.0.1 db_pengumuman -e \"CREATE TABLE IF NOT EXISTS duty_attendance (id INT AUTO_INCREMENT PRIMARY KEY, teacher_name VARCHAR(100) NOT NULL, location VARCHAR(100) NOT NULL, time_slot VARCHAR(50) NOT NULL, date DATE NOT NULL, check_in_time DATETIME NOT NULL);\"",
    "systemctl restart fastapi_pengumuman_ese.service"
]

for cmd in commands:
    print("Running:", cmd)
    stdin, stdout, stderr = client.exec_command(cmd)
    print("OUT:", stdout.read().decode('utf-8', errors='ignore'))
    print("ERR:", stderr.read().decode('utf-8', errors='ignore'))

client.close()
