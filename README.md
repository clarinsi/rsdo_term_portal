# Terminology Portal

## Quick Overview

An opensource Terminology portal which anybody can set up (hopefully without much trouble).

The main instance is available at [https://terminoloski.slovenscina.eu](https://terminoloski.slovenscina.eu).

You can use your own instance completely independently or link it with other such instances, including the main one, and have them share dictionaries and their entries.

Likewise, the included consultancy module can use its built-in, fully featured tools for your consultants to process terminology questions (default)
or simply be linked with the one at [ISJFR, ZRC SAZU](https://isjfr.zrc-sazu.si) so that their professional consultants will answer the questions.

## Setting up your own instance of the portal

_The guide is written for Ubuntu 22.04 LTS. Adjust according to your OS._

### 1. Install external dependencies first

1. Install the [Docker Engine](https://docs.docker.com/engine/install/).
2. Install the [Term Candidate Extraction API](https://github.com/clarinsi/rsdo_luscilnik).
3. Make sure you have a SMTP server/service available, which the portal will require.
4. Install a reverse proxy (e.g. [Nginx](https://nginx.org/en/)).

### 2. Reconfigure the docker engine

By default, docker engine doesn't perform log rotation, which will eventually lead to disk exhaustion.
Search indexes will prevent all write operations at 90% full which will make many operations on the portal fail until
disk usage falls under 85% again.

Also, by default, image build process is not optimized.

To address both of the above, it is suggested to add the following to the _/etc/docker/daemon.json_ :

```
{
  "log-driver": "local",
  "features": {
    "buildkit": true
  }
}
```

Even better, set `"log-driver": "journald"` instead, so the logs get sent straight to your journald.
Alternatively, set your own preferred log aggregator as per [the official documentation](https://docs.docker.com/config/containers/logging/configure/).

**You need to restart the engine for the settings to take effect. Run:** `sudo systemctl restart docker.service`

### 3. Get and configure the portal

1. Using [git](https://git-scm.com/) transfer the portal code into desired directory with `git clone https://github.com/clarinsi/rsdo_term_portal.git <directory path>`
2. Navigate into that directory and copy the _.env_ file from the _dev_ folder one level up (into the root directory of the portal).
3. Open the copied _.env_ file in a text editor and adjust the parameters of your portal.

### 4. (Advanced/optional) Adjust data storage locations

By default, all data is stored and persisted inside Docker's [volumes](https://docs.docker.com/storage/volumes/)
on your host's root partition.
If you have a setup where for any reason you want to store data elsewhere,
you can reconfigure the docker-compose.prod.yml to use [bind mounts](https://docs.docker.com/storage/bind-mounts/),
just be mindful not to break shared volume dependencies.

_Using bind mounts has not been tested yet and might cause additional complications
regarding file system permissions._

### 5. Start the portal service cluster

1. Inside the portal directory, run the following command in CLI: `docker compose -f docker-compose.prod.yml --profile concordancer-manager up -d --build`
2. It's going to take some time for all the resources to get downloaded and built.
   Wait for control to be returned to CLI before continuing.

### 6. First time concordancer setup

1. Open a bash session inside the _concordancer-manager_ container by running:
   `docker exec -it $(docker ps --format "{{.Names}}" | grep concordancer-manager) bash`
2. In that session, run: `dotnet Rsdo.Concordancer.SystemManager.dll createMasterDb --connectionString="Host=postgres;Username=concordancer;Password=<POSTGRES_CONCORDANCER_PASSWORD>;Database=postgres"`.
   Replace `<POSTGRES_CONCORDANCER_PASSWORD>` with the value you set for it in the _.env_ file.
3. After that, also in that session, run: `dotnet Rsdo.Concordancer.SystemManager.dll importSloleks --sourceFile=/sloleks/Sloleks2.0.LMF/sloleks_clarin_2.0.xml`.
   This command takes a bit more time than the previous one to finish.
4. Close the session _(Ctrl + D)_

### 7. Reverse proxy setup

1. Forward the majority of trafic to the the main port,
   set appropriate headers, needed for normal functioning of the webserver
   and increase the maximum allowed request body size.
   Example location block for Nginx config:

```
location / {
  proxy_set_header X-Forwarded-Host $host:$server_port;
  proxy_set_header X-Forwarded-Server $host;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;

  client_max_body_size 1100M;
  proxy_pass http://127.0.0.1:<EXPRESS_LISTEN_PORT>;
}
```

Replace <EXPRESS_LISTEN_PORT> with whichever port you set as EXPRESS_LISTEN_PORT in the .env file,
or even change the IP address or protocol if you've done done some changes to docker-compose.prod.yml or other system wide configuration and generally know, what you're doing.

2. Forward concordancer client trafic to the _/korpus_ path
   Example location block for Nginx config:

```
location /korpus/ {
  proxy_pass http://127.0.0.1:<CONCORDANCER_LISTEN_PORT>/;
}
```

Same as above, except replace <CONCORDANCER_LISTEN_PORT> with the value of CONCORDANCER_LISTEN_PORT.

3. Don't forget setting up proper SSL termination, compression, ...

4. Also don't forget to make your changes take effect.
   For Nginx, `sudo systemctl reload nginx.service` is usually the easiest way.

### 8. Done

Your portal should now be available at whichever address/domain your reverse proxy is set to listen to.

## Linking your instance with others

1. Using a web browser, navigate to your portal's main page.
2. In the upper right corner, change language to English.
   (the instructions are written using english UI labels)
3. Log in as the portal admin user.
4. Navigate Menu -> Administration -> Links -> Add link.
5. Fill in all the fields:

   - **Portal name** - your choice; it'll be displayed as the source of found entries, when the users use the portal's search tool.

   - **Portal label** - a 2 letter code of your choice; same as portal name, except a shorter version.

   - **URL (dictionaries sync)** - Format: <target_portal_origin>/api/v1/system/inter-instance-sync/dictionaries

     Replace <target_portal_origin> with the origin of the portal, the dictionaries of which you wish to add to your portal.

     To link the main instance of the portal, for example, you would enter:
     https://terminoloski.slovenscina.eu/api/v1/system/inter-instance-sync/dictionaries

   - **URL (dictionary entries sync)** - Format: <target_portal_origin>/api/v1/system/inter-instance-sync/dictionary/$SOURCE_ID/entries?lastSynced=$SINCE

     <target_portal_origin> should be the same as for previous URL.

     To link the main instance of the portal, for example, you would enter:
     https://terminoloski.slovenscina.eu/api/v1/system/inter-instance-sync/dictionary/$SOURCE_ID/entries?lastSynced=$SINCE

6. Click _Add link_. You will be returned to the list of linked portals, where the newly created portal will now be listed.
7. Click _Dictionaries_ to see the list of all available dictionaries of the target portal. Enable the ones you wish to be added to your portal, click _Save_.
8. The selected dictionaries and all their entries will be automatically synchronized each night.

## Linking to ZRC SAZU Terminological counselling

If you wish professional counselors to answer your users' terminological questions,
you can do so by simply toggling a switch in the administration console.

1. As previously described, navigate to the Menu -> Administration -> Basic settings -> Consultancy.
2. Select _ZRC SAZU Terminological counselling_.
3. Click Save.

That's it.
Your questions will now be automatically forwarded to ZRC SAZU Terminological counselling
and their answers back to your portal.
