# GPS Tracker with Alcohol Sensor - Hardware Documentation

## Project Overview
This device combines GPS tracking with alcohol detection capability, featuring:
- ESP32 for processing and connectivity
- NEO-6M GPS module for location tracking
- SIM800L V2 for GSM/GPRS communication
- MQ-3 alcohol sensor for detection
- Dual power system (USB/Battery)

## Directory Structure
```
hardware/
├── GPS_GSM_MQTT.ino      # Arduino firmware
├── kicad/                # Hardware design files
│   ├── gps_alcohol_tracker.kicad_pro    # Project file
│   ├── gps_alcohol_tracker.kicad_sch    # Main schematic
│   ├── power_supply.kicad_sch          # Power supply schematic
│   ├── esp32_core.kicad_sch           # ESP32 schematic
│   ├── gps_module.kicad_sch           # GPS module schematic
│   ├── gsm_module.kicad_sch           # GSM module schematic
│   ├── mq3_sensor.kicad_sch           # Alcohol sensor schematic
│   ├── gps_alcohol_tracker.kicad_pcb   # PCB layout
│   ├── gps_alcohol_tracker_bom.csv     # Bill of Materials
│   └── generate_gerbers.py            # Gerber generation script
```

## Hardware Specifications
- Board dimensions: 100mm x 80mm
- Layer count: 2 layers
- Minimum trace width: 0.2mm
- Power trace width: 0.5mm
- Board thickness: 1.6mm

## Key Components
1. Processing Unit
   - ESP32-WROOM-32D module
   - Operating voltage: 3.3V
   - Flash memory: 4MB

2. GPS Module
   - NEO-6M with active antenna
   - Communication: UART (TX: GPIO17, RX: GPIO16)
   - Update rate: 1Hz

3. GSM Module
   - SIM800L V2
   - Operating voltage: 5V
   - Communication: UART (TX: GPIO2, RX: GPIO4)
   - Supports 2G networks

4. Alcohol Sensor
   - MQ-3 sensor
   - Operating voltage: 5V
   - Analog output: GPIO34
   - Detection range: 0.05-10mg/L

5. Power Supply
   - Input: 5V USB or 3.7V Li-Po battery
   - 3.3V regulator: AMS1117-3.3
   - Reverse polarity protection
   - Power LED indicator

## Manufacturing Instructions

### 1. Generate Manufacturing Files
You have three options to generate Gerber files:

#### Option 1: Using Python Script
1. Install KiCad 6.0 or later
2. Set up the environment:
   - Windows: Add 'C:\Program Files\KiCad\6.0\bin' to PATH
   - Linux: Usually available after KiCad installation
   - MacOS: Add KiCad Python path to PATH
3. Run the script:
   ```bash
   cd frontend/hardware/kicad
   python generate_gerbers.py
   ```

#### Option 2: Using KiCad GUI
1. Open PCB file in KiCad PCB Editor
2. File -> Plot
3. Select layers:
   - F.Cu (Top copper)
   - B.Cu (Bottom copper)
   - F.Paste (Top paste)
   - B.Paste (Bottom paste)
   - F.SilkS (Top silkscreen)
   - B.SilkS (Bottom silkscreen)
   - F.Mask (Top mask)
   - B.Mask (Bottom mask)
   - Edge.Cuts (Board outline)
4. Generate Drill Files:
   - File -> Fabrication Outputs -> Drill Files

#### Option 3: Using Command Line
```bash
# Windows
"C:\Program Files\KiCad\6.0\bin\kicad-cli.exe" pcb export gerbers gps_alcohol_tracker.kicad_pcb

# Linux
kicad-cli pcb export gerbers gps_alcohol_tracker.kicad_pcb

# MacOS
/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli pcb export gerbers gps_alcohol_tracker.kicad_pcb
```

### 2. PCB Manufacturing Requirements
- Material: FR4
- Thickness: 1.6mm
- Copper weight: 1oz
- Surface finish: HASL lead-free
- Solder mask: Green
- Silkscreen: White

### 3. Component Assembly
1. Power supply components
   - AMS1117 regulator
   - Filtering capacitors
   - Protection diode

2. ESP32 module and supporting components
   - Decoupling capacitors
   - Pull-up resistors
   - Programming header

3. GPS and GSM modules
   - Antenna connectors
   - Interface components
   - Status LED

4. MQ-3 sensor
   - Load resistor
   - Filtering capacitor

## Testing Procedure
1. Power Supply Testing
   - Check 5V input
   - Verify 3.3V output
   - Test current consumption

2. Communication Testing
   - ESP32 programming
   - GPS signal acquisition
   - GSM network registration

3. Sensor Calibration
   - MQ-3 warm-up (24 hours recommended)
   - Calibration in clean air
   - Test with known concentrations

## Safety Considerations
1. Power Supply
   - Don't exceed 5V input
   - Ensure proper battery polarity
   - Monitor charging current

2. RF Considerations
   - Keep antenna cables short
   - Maintain separation between antennas
   - Follow RF exposure guidelines

3. Sensor Handling
   - Allow proper ventilation
   - Don't expose to high concentrations
   - Regular calibration required

## Troubleshooting Guide
1. Power Issues
   - Check input voltage
   - Verify regulator output
   - Check for shorts

2. Communication Problems
   - Verify UART connections
   - Check antenna connections
   - Validate GSM signal strength

3. Sensor Issues
   - Verify power supply
   - Check analog reading
   - Recalibrate if needed

## License
This hardware design is licensed under the CERN Open Hardware License Version 2.
