![song rat logo](./song_rat.png)

> *Special thanks to [Ryan](https://github.com/RyanTurley) for the logo!*

# SongRat.ing

This repo is the source code for a web app that lets you create playlists and
rate your friend's songs out of 10. You can visit the site at
[songrat.ing](https://songrat.ing).

This project is in active development. As such, some things are not complete or
polished. Below is a list of things that still need to be done before the site
is "finished".

- Administration page for managing games (currently only possible via backend
  api requests).
- Python/Pandas data analysis API to get info about completed games. This will
  tell you things like the best/worst/most average songs and playlists and how
  any individual person rated songs.

## Development

To work on this project you'll need to set up your `.env` file and generate self
signed SSL certificates (this script does all of that):

```bash
./scripts/dev_setup.sh
```

## Deployment

For info on deploying the app, see the [deployment info](./docs/deployment.md).
