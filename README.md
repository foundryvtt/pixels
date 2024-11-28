# Pixels Electronic Dice - Foundry VTT Integration

![Pixels Electronic Dice Logo](https://raw.githubusercontent.com/foundryvtt/pixels/main/ui/pixels-logo.webp)

This module integrates **Pixels - The Electronic Dice** (https://gamewithpixels.com) with **Foundry Virtual Tabletop** (https://foundryvtt.com).

## Requirements
To use this module you must have:
1. A computer with support for Bluetooth devices and you a web browser that supports the `WebBluetooth` API (https://caniuse.com/web-bluetooth).
2. One or more Pixels electronic dice. This module is currently designed and tested using Pixels DevKit d20s.

## SSL
In order for other players to use their pixels dice while playing on your server, the server must have SSL enabled. This is a limitation of the `WebBluetooth` technology. The easiest way to do this is with a self-signed certificate. You can find instructions on how to enable a self-signed certificate with Foundry VTT in this [Knowledge Base article](https://foundryvtt.com/article/ssl/#self-signed).

## Installing and Activating the Module
Install the "Pixels - Electronic Dice" module from the Foundry Virtual Tabletop module installation menu. In your game World, activate the "Pixels - Electronic Dice" module.

## Enabling Pixels Dice Integration
Navigate to the **Settings** sidebar, **Configure Settings**, and the **Pixels** tab. From here check the **Enable Pixels Dice** setting. You will be automatically prompted after this to configure your dice. You can return to this menu at any time to disable Pixels dice or change your Pixels configuration.

## Configuring Pixels Dice
In the **Pixels Electronic Dice Configuration** menu you can click **Add Pixel Dice** to pair a new Pixel device with Foundry Virtual Tabletop. Once a die is paired it is eligible to be used for manual rolls or to fulfill system-generated rolls.

![Pixels Electronic Dice Configuration](https://raw.githubusercontent.com/foundryvtt/pixels/main/ui/pixels-config.webp)

Due to a current limitation with WebBluetooth, your dice do not automatically re-connect each time you refresh your browser. A new Chrome feature can be enabled to allow automatic reconnection. To enable this feature you must visit chrome://flags in your Google Chrome browser and enable the **Use the new permissions backend for Web Bluetooth** setting. This is an *optional step* which can improve your user experience with Pixels devices. If your browser does not support this option, or you do not wish to enable it, you can manually pair each die at the start of your game session.

## Configuring Foundry VTT
Once your pixels dice are configured, navigate again to the **Settings** tab, **Configure Settings**, then, under Core settings, open the **Configure Dice** menu. Here you can configure which dice rolls the Foundry VTT software should use your pixels dice to resolve.

![Foundry VTT Dice Configuration](https://raw.githubusercontent.com/foundryvtt/pixels/main/ui/dice-config.webp)

# Contribution Policy
This code is offered under the MIT License. Code contributions are accepted with the following process.

1. Create an Issue that describes the change you wish to make to this package. You may reference a pre-existing issue if one already exists.
2. If you are a **first time contributor**, comment on the issue that you wish to address to confirm that it is a suitable topic for a PR before beginning work. This step is intended to protect your time (and ours) from a PR which is unlikely to be feasible or merge-able for any reason. This step is recommended (but not required) for repeat contributors.
3. Create a PR from a forked branch of this repository. In your PR provide a link to the issue, a clear and concise description of the change, and the test process you followed to verify that your proposed change is working correctly.
4. Please be patient in waiting for review of your PR. Sometimes this will occur quickly, sometimes this could take a long time depending on our current prioritization. If you disagree with any of the comments provided, please feel free to state your differing opinion, but ultimately changes requested as part of the PR process are **non-negotiable**. Your code will not be merged if there are any unresolved comments.
5. Once your code is merged, you will be credited and acknowledged in the next release of the module.
