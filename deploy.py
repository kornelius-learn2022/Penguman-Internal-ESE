import paramiko
import time
import sys

host = '202.155.14.105'
user = 'root'
password = 'Lius_20071997'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    print(f"Connecting to {host}...")
    client.connect(host, username=user, password=password, timeout=10)
    print("Connected successfully!")
    
    # Let's find where the project is
    stdin, stdout, stderr = client.exec_command("find /root -name 'Penguman-Internal-ESE' -type d -maxdepth 2")
    output = stdout.read().decode('utf-8').strip()
    
    if output:
        project_dir = output.split('\n')[0]
        print(f"Found project at: {project_dir}")
        
        # Pull latest changes
        print("Pulling git...")
        stdin, stdout, stderr = client.exec_command(f"cd {project_dir} && git fetch --all && git reset --hard origin/main")
        print(stdout.read().decode('utf-8', errors='ignore'))
        print(stderr.read().decode('utf-8', errors='ignore'))
        
        # Build and restart using docker-compose
        print("Restarting docker containers...")
        stdin, stdout, stderr = client.exec_command(f"cd {project_dir} && docker-compose down && docker-compose build && docker-compose up -d")
        print(stdout.read().decode('utf-8', errors='ignore'))
        print(stderr.read().decode('utf-8', errors='ignore'))
        
        print("Done deploying!")
    else:
        print("Project directory not found in /root. Trying /var/www...")
        stdin, stdout, stderr = client.exec_command("find /var/www -name 'Penguman-Internal-ESE' -type d -maxdepth 2")
        output2 = stdout.read().decode('utf-8', errors='ignore').strip()
        if output2:
            project_dir = output2.split('\n')[0]
            print(f"Found project at: {project_dir}")
            print("Pulling git...")
            stdin, stdout, stderr = client.exec_command(f"cd {project_dir} && git fetch --all && git reset --hard origin/main")
            print(stdout.read().decode('utf-8', errors='ignore'))
            print(stderr.read().decode('utf-8', errors='ignore'))
            
            print("Restarting docker containers...")
            stdin, stdout, stderr = client.exec_command(f"cd {project_dir} && docker-compose down && docker-compose build && docker-compose up -d")
            print(stdout.read().decode('utf-8', errors='ignore'))
            print(stderr.read().decode('utf-8', errors='ignore'))
            print("Done deploying!")
        else:
            print("Project directory could not be found.")

except Exception as e:
    print(f"Error: {e}")
finally:
    client.close()
