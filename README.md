![song rat logo](./song_rat.png)

> *Special thanks to [Ryan](https://github.com/RyanTurley) for the logo!*

# SongRat.ing

This repo is the source code for a web app that lets you create playlists and
rate your friend's songs out of 10. You can visit the site at
[songrat.ing](https://songrat.ing).

## Development

To work on this project you'll need to set up your `.env` file and generate self
signed SSL certificates (this script does all of that):

```bash
./scripts/dev_setup.sh
```

The backend API spec can be found [here](./docs/openapi.yml).

## Deployment

For info on deploying the app, see the [deployment info](./docs/deployment.md).
