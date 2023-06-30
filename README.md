# Pixels Electronic Dice - Foundry VTT Integration

![alt text](https://raw.githubusercontent.com/foundryvtt/pixels/main/ui/pixels-logo.png)

This module integrates **Pixels - The Electronic Dice** (https://gamewithpixels.com) with **Foundry Virtual Tabletop** (https://foundryvtt.com).

## Requirements
To use this module you must have:
1. A computer with support for Bluetooth devices and you a web browser that supports the `WebBluetooth` API (https://caniuse.com/web-bluetooth). The installed Foundry Virtual Tabletop application satisfies this browser requirement.
2. One or more Pixels electronic dice. This module is currently designed and tested using Pixels DevKit d20s.

## Installing and Activating the Module
Install the `pixels` module from the Foundry Virtual Tabletop module installation menu. Also install the dependency module `unfulfilled-rolls` which you will be automatically prompted to install. In your game World, activate both the `pixels` and `unfulfilled-rolls` modules.

## Enabling Pixels Dice Integration
Navigate to the **Settings** sidebar, **Configure Settings**, and the **Pixels** tab. From here check the **Enable Pixels Dice** setting. You will be automatically prompted after this to configure your dice. You can return to this menu at any time to disable Pixels dice or change your Pixels configuration.

## Configuring Pixels Dice
In the **Pixels Electronic Dice Configuration** menu you can click **Add Pixel Dice** to pair a new Pixel device with Foundry Virtual Tabletop. Once a die is paired it is eligible to be used for manual rolls or to fulfill system-generated rolls.

Due to a current limitation with WebBluetooth, your dice do not automatically re-connect each time you refresh your browser. A new Chrome feature can be enabled to allow automatic reconnection. To enable this feature you must visit chrome://flags in your Google Chrome browser and enable the **Use
the new permissions backend for Web Bluetooth** setting. This is an *optional step* which can improve your user experience with Pixels devices. If your browser does not support this option, or you do not wish to enable it, you can manually pair each die at the start of your game session.
