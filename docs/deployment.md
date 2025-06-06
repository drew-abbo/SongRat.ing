# Deployment

This document outlines how to deploy the app on a self hosted Ubuntu server.

## Setup

Here are the steps that need to be taken to deploy the server on a fresh Ubuntu
install.

1. Port forward the server on ports 80 and 443.

2. Adjusting the DNS settings for the domain name so it points to the public IP
   of the server.

3. Ensure everything is up to date and install some basics.

```bash
sudo apt update && sudo apt upgrade -y
```

4. Set up firewall (allow ports 80 and 443).

```bash
sudo apt install ufw
# do some firewall setup (not shown here)
sudo ufw allow 80,443/tcp
```

5. Install Docker & Docker Compose.

```bash
sudo apt install apt-transport-https ca-certificates curl software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install docker-ce
docker --version
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
sudo curl -L "https://github.com/docker/compose/releases/download/v2.19.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
docker-compose --version
```

6. Clone the repo and move into it (clone as root so root cron jobs work).

```bash
sudo apt install git
sudo git clone https://github.com/drew-abbo/SongRat.ing.git song_rating
cd song_rating
```

7. Set up SSL and get it to auto renew with a cron job.

```bash
sudo systemctl start cron
sudo systemctl enable cron
sudo apt install certbot
sudo certbot certonly --standalone -d songrat.ing
sudo cp -r /etc/letsencrypt $(pwd)/frontend/certificates
echo "0 0,12 * * * $(pwd)/scripts/renew_ssl.sh 2>> $(pwd)/cron.log" | sudo tee -a /var/spool/cron/crontabs/root > /dev/null
```

8. Set up auto patching every minute.

```bash
echo "* * * * * $(pwd)/scripts/patch.sh 2>> $(pwd)/cron.log" | sudo tee -a /var/spool/cron/crontabs/root > /dev/null
```

9. Set up database backups every 30 minutes. Replace `dest` with the SCP
   destination (like
   `other_server_user@other_server_ip:/path/to/backup/location/`) and
   `ssh_key_file` with the path to the ssh private key file to use. Note that
   you need to have a working ssh connection already set up between the server
   and the backup server for this to work.

```bash
echo "*/30 * * * * $(pwd)/scripts/backup_db.sh dest ssh_key_file 2>> $(pwd)/cron.log" | sudo tee -a /var/spool/cron/crontabs/root > /dev/null
```

1.   Look at [.env.example](./.env.example) and create a `.env` file that matches
     the template.

## Managing the Server

To start the server:

```bash
sudo docker-compose up -d
```

To view the logs for a component of the server (`$CONTAINER` can be
`frontend`, `backend`, or `postgres`):

```bash
sudo docker-compose logs -f $CONTAINER
```

To take down a component of the server (`$CONTAINER` can be `frontend`,
`backend`, or `postgres`):

```bash
sudo docker-compose stop $CONTAINER
```

To patch an update:

```bash
sudo ./scripts/patch.sh
```

To patch an update (force patch):

```bash
sudo ./scripts/patch.sh --force
```

To manually view and edit the database (be careful):

```bash
sudo ./scripts/db_connect.sh
```

To manually renew SSL certificate:

```bash
sudo ./scripts/renew_ssl.sh
```

To backup the database to another server (replace `dest` with the SCP
destination (like `other_server_user@other_server_ip:/path/to/backup/location/`)
and `ssh_key_file` with the path to the ssh private key file to use).

```bash
sudo ./scripts/backup_db.sh dest ssh_key_file
```
