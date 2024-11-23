const express = require('express');
const debug = require('debug')('babelpod:server');
const path = require('path');

function setupRoutes(app, deviceManagers) {
  const { airplayManager, pcmManager, inputManager } = deviceManagers;

  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../index.html'));
  });

  app.get('/stats', (req, res) => {
    const stats = {
      airplay: {
        activeDevices: airplayManager.getActiveDevices(),
        volumes: Object.fromEntries(airplayManager.deviceVolumes)
      },
      pcm: {
        activeDevices: pcmManager.getActiveDevices(),
        volumes: Object.fromEntries(pcmManager.deviceVolumes)
      },
      input: {
        currentDevice: inputManager.getCurrentInput()
      }
    };

    debug('Stats requested:', stats);
    res.json(stats);
  });

  return app;
}

module.exports = setupRoutes;