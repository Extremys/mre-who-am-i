/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import { AttachPoint } from '@microsoft/mixed-reality-extension-sdk';

/**
 * The structure of a name entry in the name database.
 */
type NameDescriptor = {
	displayName: string;
	resourceName: string;
	scale: {
		x: number;
		y: number;
		z: number;
	};
	rotation: {
		x: number;
		y: number;
		z: number;
	};
	position: {
		x: number;
		y: number;
		z: number;
	};
	attachPoint: AttachPoint;
};


const allowedCountries: string[] = ["france", "world"];


/**
 * WearAName Application - Showcasing avatar attachments.
 */
export default class WearAName {
	// Container for preloaded name prefabs.
	private hat: MRE.Actor = null;
	private assets: MRE.AssetContainer;
	// Container for instantiated names.
	private attachedNames = new Map<MRE.Guid, MRE.Actor>();
	private attachedLabel = new Map<MRE.Guid, MRE.Actor>();
	private country: string;
	private NameDatabase: string[];
	/**
	 * Constructs a new instance of this class.
	 * @param context The MRE SDK context.
	 * @param baseUrl The baseUrl to this project's `./public` folder.
	 */
	constructor(private context: MRE.Context, private params: MRE.ParameterSet) {
		this.country = this.params.country as string

		if (this.params.country === undefined) {
			this.country = "world";
		}
		if (allowedCountries.includes(this.country) === false) {
			this.country = "world";
		}
		const uri = '../public/countries/' + this.country + '.json';
		this.NameDatabase = require(uri);

		this.assets = new MRE.AssetContainer(context);
		// Hook the context events we're interested in.
		this.context.onStarted(() => this.started());
		this.context.onUserLeft(user => this.userLeft(user));

	}

	/**
	 * Called when a Names application session starts up.
	 */
	private async started() {
		// Check whether code is running in a debuggable watched filesystem
		// environment and if so delay starting the app by 1 second to give
		// the debugger time to detect that the server has restarted and reconnect.
		// The delay value below is in milliseconds so 1000 is a one second delay.
		// You may need to increase the delay or be able to decrease it depending
		// on the speed of your PC.
		const delay = 1000;
		const argv = process.execArgv.join();
		const isDebug = argv.includes('inspect') || argv.includes('debug');

		// // version to use with non-async code
		// if (isDebug) {
		// 	setTimeout(this.startedImpl, delay);
		// } else {
		// 	this.startedImpl();
		// }

		// version to use with async code
		if (isDebug) {
			await new Promise(resolve => setTimeout(resolve, delay));
			await this.startedImpl();
		} else {
			await this.startedImpl();
		}
	}

	private startedImpl = async () => {
		await this.showHat();
	}

	/**
	 * Called when a user leaves the application (probably left the Altspace world where this app is running).
	 * @param user The user that left the building.
	 */
	private userLeft(user: MRE.User) {
		// If the user was wearing a name, destroy it. Otherwise it would be
		// orphaned in the world.
		this.removeNames(user);
	}


	private showHat = async () => {
		const hatData = await this.assets.loadGltf('hat.glb', "mesh");
		// spawn a copy of the glTF model
		this.hat = MRE.Actor.CreateFromPrefab(this.context, {
			// using the data we loaded earlier
			firstPrefabFrom: hatData,
			// Also apply the following generic actor properties.
			actor: {
				collider: { geometry: { shape: MRE.ColliderType.Auto } },
				name: 'Hat',
				transform: {
					local: {
						position: { x: 0, y: 0.5, z: 0 },
						scale: { x: 1, y: 1, z: 1 }
					}
				}
			}
		});

		const buttonBehavior = this.hat.setBehavior(MRE.ButtonBehavior);

		buttonBehavior.onClick(user => this.wearName(user.id));

		MRE.Actor.Create(this.context, {
			actor: {
				parentId: this.hat.id,
				name: 'label',
				text: {
					contents: "Version : " + this.country,
					height: 0.1,
					anchor: MRE.TextAnchorLocation.MiddleCenter
				},
				transform: {
					local: { position: { x: 0, y: 1, z: 0 } }
				}
			}
		});

	}

	private wearName(userId: MRE.Guid) {

		// If the user is wearing a hat, destroy it.
		this.removeNames(this.context.user(userId));
		const names = this.NameDatabase;
		const name = names[Math.round(Math.random() * names.length)];
		const label3D = MRE.Actor.Create(this.context, {
			actor: {
				name: 'label',
				text: {
					contents: name,
					height: 0.8,
					anchor: MRE.TextAnchorLocation.MiddleCenter,
					color: { r: 255, g: 255, b: 255 },

				},
				transform: {
					local: {
						position: { x: 0, y: 0.4, z: -0.3 },
						rotation: MRE.Quaternion.FromEulerAngles(
							0 * MRE.DegreesToRadians,
							0 * MRE.DegreesToRadians,
							0 * MRE.DegreesToRadians),
						scale: { x: 0.08, y: 0.08, z: 0.08 }
					}
				},
				attachment: {
					attachPoint: 'hips',
					userId

				}
			}
		});
		const blackChars = '█';
		const labelBackground = MRE.Actor.Create(this.context, {
			actor: {
				name: 'label',
				text: {
					contents: blackChars.padStart(name.length, '█'),
					height: 0.8,
					anchor: MRE.TextAnchorLocation.MiddleCenter,
					color: { r: 0, g: 0, b: 0 },

				},
				transform: {
					local: {
						position: { x: 0, y: 0.4, z: -0.27 },
						rotation: MRE.Quaternion.FromEulerAngles(
							0 * MRE.DegreesToRadians,
							0 * MRE.DegreesToRadians,
							0 * MRE.DegreesToRadians),
						scale: { x: 0.08, y: 0.08, z: 0.08 }
					}
				},
				attachment: {
					attachPoint: 'hips',
					userId

				}
			}
		});

		// Create the hat model and attach it to the avatar's head.
		this.attachedNames.set(userId, label3D);
		this.attachedLabel.set(userId, labelBackground);
	}

	private removeNames(user: MRE.User) {
		if (this.attachedNames.has(user.id)) { this.attachedNames.get(user.id).destroy(); }
		this.attachedNames.delete(user.id);
		if (this.attachedLabel.has(user.id)) { this.attachedLabel.get(user.id).destroy(); }
		this.attachedLabel.delete(user.id);
	}
}
