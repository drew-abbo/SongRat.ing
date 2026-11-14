# Deployment

This document outlines how to deploy and maintain the app on an Ubuntu server.

- [Initial Server Setup](#initial-server-setup)
- [Managing the Server](#managing-the-server)

## Initial Server Setup

Here are the steps that need to be taken to deploy the server on a fresh Ubuntu
install (last tested on *Ubuntu 26.04.1 LTS*).

1. Port forward the server on ports 80 and 443.

   - You *need* port 80 for cert renewal.
   - Don't forget you'll also need port 22 if you want to use SSH.

2. Update DNS so the domain name points to the public IP of the server.

   - This needs to be done before you try to set up `certbot`.

3. Ensure everything is up to date.

   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

4. Make sure the timezone is what you want.

   - If `date` returns a time in a weird timezone, update it to be the local
     time you want:
     ```bash
     sudo timedatectl set-timezone America/Detroit
     ```

5. Set up firewall (allow ports 80 and 443).

   - You *need* port 80 for cert renewal.
   - Don't forget you'll also need port 22 if you want to use SSH.
   - Remember that Docker conflicts with firewalls like `UFW`.

6. Install Docker and Docker Compose.

   - You can install Docker with `apt`, you just have to do it in a special way.
   - Make sure `docker-compose` works (not just `docker compose`), create an
     alias for it if it doesn't.

7. Clone the repo and move into it.
   ```bash
   sudo apt install git
   sudo git clone https://github.com/drew-abbo/SongRat.ing.git song_rating
   cd song_rating
   ```

8. Create a `.env` file (see the template [`.env.example`](../.env.example)).

9. Set up `certbot`.

   ```bash
   sudo apt install certbot
   sudo certbot certonly --standalone -d songrat.ing
   ```

10. Set up some cron jobs.

    Run `crontab -e` and add the following lines.
    Replace `$APP_PATH` with the absolute path to where the repo is cloned.
    ```crontab
    # see if we can renew cert (every 12 hours)
    0 0,12 * * * $APP_PATH/scripts/renew_ssl.sh 2>> $APP_PATH/cron.log

    # auto patching (every minute)
    * * * * * $APP_PATH/scripts/patch.sh 2>> $APP_PATH/cron.log

    # database backup - max 64 backups (every 6 hours)
    0 */6 * * * $APP_PATH/scripts/backup_db.sh $APP_PATH/backups 64 2>> $APP_PATH/cron.log
    ```

11. Set up automatic security update patching.

    - Verify basic `apt` package patching is set up.

      - You should see `apt-daily.timer` and `apt-daily-upgrade.timer` when you
        run this command:
        ```bash
        systemctl list-timers 'apt-*'
        ```
      - You should see `APT::Periodic::Update-Package-Lists "1";` and
        `APT::Periodic::Unattended-Upgrade "1";` when you run this command:
        ```bash
        cat /etc/apt/apt.conf.d/20auto-upgrades
        ```

    - Allow auto-patching to restart the system.

      Create a file `/etc/apt/apt.conf.d/60auto-reboot` with these contents:
      ```
      Unattended-Upgrade::Automatic-Reboot "true";
      Unattended-Upgrade::Automatic-Reboot-WithUsers "true";
      Unattended-Upgrade::Automatic-Reboot-Time "03:30";
      ```
      > If there's a security patch that requires a restart to be applied (e.g.
      > an update to the kernel), this will restart the system to apply changes.
      > This reboot will happen around 3:30 AM (even if someone is logged in).

    - Set up Docker patching.

      - Docker won't update automatically, and if it did it could break the app.
      - Exclude Docker from unattended-upgrades by opening
        `/etc/apt/apt.conf.d/50unattended-upgrades` and adding the following
        to the blacklist section (`Unattended-Upgrade::Package-Blacklist {`).
        ```
        	"docker-ce";
        	"docker-ce-cli";
        	"containerd.io";
        	"docker-buildx-plugin";
        	"docker-compose-plugin";
        	"docker-ce-rootless-extras";
        ```
        > You might want to verify you actually have all these packages:
        > `dpkg -l | grep -E 'docker|containerd\.io'`
      - Run `crontab -e` and add a scheduled job to run
        [`update_docker.sh`](../scripts/update_docker.sh).
        Replace `$APP_PATH` with the absolute path to where the repo is cloned.
        ```crontab
        # keep docker up to date (every day 4:00 AM)
        0 4 * * * $APP_PATH/scripts/update_docker.sh >> $APP_PATH/cron.log 2>> $APP_PATH/cron.log
        ```
        > The script checks for Docker updates and applies them when needed,
        > properly restarting the app in the process. Note that these aren't
        > necessarily security updates, just any updates to Docker.

    - Reminder that none of this handles security vulnerabilities in the actual
      application, it just mitigates risk for most other software running on the
      system. Vulnerable app dependencies still need to be routinely patched.

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
