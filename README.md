# BabelPod

A modern AirPlay bridge that connects various audio inputs (Line-in, Bluetooth, PCM) to AirPlay speakers, including HomePod. Originally created by Andrew Faden to enable line-in for HomePod, this fork adds Bluetooth support, a modern React frontend, and cross-platform compatibility.

## Features

- Connect any AirPlay speaker (including HomePod) to:
  - Line-in audio sources
  - Bluetooth devices (NEW)
  - PCM audio devices
- Modern React-based web interface with:
  - Real-time device discovery
  - Individual volume controls
  - Device grouping
  - Presets support
  - Dark mode
- Cross-platform support for Linux and macOS (NEW)
- Multi-speaker output with synchronized audio (NEW)
- Volume normalization and control
- Low latency audio routing

## Getting Started

### Prerequisites

#### For Linux:
```bash
# Audio and Bluetooth dependencies
sudo apt-get install bluez pulseaudio-module-bluetooth
npm install dbus-next

# ALSA and AirPlay dependencies
sudo apt-get install libasound2-dev avahi-daemon
```

#### For macOS:
```bash
# Install required utilities
brew install blueutil switchaudio-osx
```

### Installation

1. Clone the repository:
```bash
git clone https://github.com/YOUR_USERNAME/babelpod.git
cd babelpod
```

2. Install Node.js dependencies:
```bash
npm install
```

3. Build the application:
```bash
npm run build
```

4. Start the server:
```bash
npm start
```

The web interface will be available at `http://localhost:3000`

## Development

To run in development mode with hot reloading:

```bash
npm run dev
```

This will start both the backend server and frontend development server.

## Architecture

- Frontend: React with TypeScript, using modern patterns and Tailwind CSS
- Backend: Node.js with Express
- Real-time communication: Socket.IO
- Audio Routing: Native OS audio APIs and ALSA
- Device Discovery: mDNS for AirPlay, D-Bus for Bluetooth

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## Authors

- [**Guy Sperry**](https://github.com/gsperry) - *Modern rewrite, multiple outputs, Bluetooth support, cross-platform compatibility*
- [**Andrew Faden**](https://github.com/afaden) - *Original creator*

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## Acknowledgments

- Original BabelPod project by Andrew Faden
- [node_airtunes2](https://github.com/ciderapp/node_airtunes2) for AirPlay functionality
- [shadcn/ui](https://ui.shadcn.com/) for React components
- The open-source community for various audio and Bluetooth libraries

## Screenshot

![BabelPod Interface](./assets/screenshot.png)