# SongRat.ing

This repo is the source code for a web app that lets you create playlists and
rate your friend's songs out of 10. You can visit the site at
[songrat.ing](https://songrat.ing).

This project is in active development.

## Deployment

### Initial Setup

Here are the steps that need to be taken to deploy the server on a fresh Ubuntu
install.

1. Port forward the server on ports 80 and 443.

2. Start by adjusting the settings for DNS settings for the domain to point to
   the public IP address of the server.

3. Ensure everything is up to date and install some basics.

```bash
sudo apt update && sudo apt upgrade -y
```

1. Set up firewall (allow ports 80 and 443).

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

6. Clone the repo and move into it.

```bash
sudo apt install git
git clone https://github.com/drew-abbo/song_rating_game.git song_rating
cd song_rating
```

7. Set up SSL and get it to auto renew with a cron job.

```bash
sudo apt install certbot
sudo certbot certonly --standalone -d songrat.ing
sudo cp -r /etc/letsencrypt $(pwd)/frontend/certificates
echo "0 0,12 * * * $(pwd)/scripts/renew_ssl.sh" | sudo tee -a /var/spool/cron/crontabs/root > /dev/null
```

8. Set up auto patching.

```bash
echo "* * * * * $(pwd)/scripts/patch.sh" | sudo tee -a /var/spool/cron/crontabs/root > /dev/null
```

9.  Look at [.env.example](./.env.example) and create a `.env` file that matches
   the template.

### Managing the Server

To start the server:

```bash
sudo docker-compose up -d
```

To view the logs for a component of the server (`$CONTAINER` can be
`frontend`, `backend`, or `postgres`):

```bash
docker-compose logs -f $CONTAINER
```

To take down a component of the server (`$CONTAINER` can be `frontend`,
`backend`, or `postgres`):

```bash
docker-compose stop $CONTAINER
```

To patch an update:

```bash
./scripts/patch.sh
```

To patch an update (force patch):

```bash
./scripts/patch.sh --force
```

To manually view and edit the database (be careful):

```bash
./scripts/db_connect.sh
```

To manually renew SSL certificate:

```bash
sudo ./scripts/renew_ssl
```
