import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('202.155.14.105', username='root', password='Lius_20071997', timeout=10)
stdin, stdout, stderr = client.exec_command('curl -s http://localhost:8002/api/announcements?tanggal=2026-09-22')
print(stdout.read().decode('utf-8', errors='ignore')[:200])
client.close()
