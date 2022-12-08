import type { MuralData, FigureData } from './lib/mural';

import * as THREE from 'three';
import { Mural } from './lib/mural';

interface Offset {
    position: THREE.Vector3,
    rotation: THREE.Euler,
    scale: THREE.Vector3
}

interface MuralEntry {
    title: string;
    artist: string;
    identifier: string;
}

interface WayspotData {
    wayspotName: string,
    offset: Offset,
}

class App {
    caption: HTMLElement | null;
    detail: HTMLElement | null;
    logElement: HTMLElement | null;

    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;

    origin: THREE.Group;
    rootContainer: THREE.Group;

    selected: THREE.Mesh | null = null;

    wayspotData: WayspotData;
    muralData: MuralData;

    initialize(scene, camera, renderer, arMode = false) {
        this.caption = document.getElementById("caption");
        this.detail = document.getElementById("detail");

        this.logElement = document.getElementById("log");
        this.logElement!.hidden = true;
        // console.log(this.info)

        // Hide caption/detail initially.
        this.displayCaption(false);
        this.displayDetail(false);

        this.caption!.addEventListener("click", () => {
            this.toggleDetail();
        });

        this.detail!.addEventListener("click", () => {
            this.displayDetail(false);
        });


        let debugButton = document.getElementById("debug");
        debugButton!.addEventListener("click", () => {
            this.logElement!.hidden = !this.logElement?.hidden;
        });


        // Fetch data.
        let mural = window.location.hash.substring(1);
        let muralUrl = `/murals/${mural}.json`;
        console.log(muralUrl);
        fetch(muralUrl)
            .then((response) => response.json())
            .then((data) => {
                this.muralData = data;
                this.muralData.scale = this.muralData.scale || 1;
                console.log(data);

                const mural = new Mural(data);
                this.rootContainer.add(mural);
            });

        // fetch("/wayspots/Scott.json")
        fetch("/wayspots.json")
            .then((response) => response.json())
            .then((data) => {
                this.wayspotData = data;
                console.log(data);
            });

        // Scene setup;
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;

        this.origin = new THREE.Group();
        // const locatorSphere = new THREE.Mesh(new THREE.SphereGeometry(.1), new THREE.MeshBasicMaterial());
        // this.origin.add(locatorSphere);

        this.scene.add(this.origin);
        this.rootContainer = new THREE.Group();
        if (arMode) this.rootContainer.visible = false;
        this.origin.add(this.rootContainer);

        this.camera.position.set(0, 1, 0)

        // Resize
        window.addEventListener('resize', () => {
            this.resize(window.innerWidth, window.innerHeight);
        });
    }

    resize(width, height) {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    update() {
        // Raycast

        let raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
        raycaster.layers.set(1);

        const intersects = raycaster.intersectObjects(this.scene.children);
        if (intersects.length > 0) {
            let newSelection = intersects[intersects.length - 1].object as THREE.Mesh;

            if (newSelection != this.selected) {
                this.deselect();

                this.selected = intersects[intersects.length - 1].object as THREE.Mesh;
                (this.selected.material as THREE.Material).opacity = .25;
                this.log(intersects[intersects.length - 1].object.name);

                const tag = intersects[intersects.length - 1].object.name;
                const figureData: FigureData | null = this.findFigure(tag);
                this.log(JSON.stringify(figureData));

                if (figureData != null) {
                    this.displayCaption(true);
                    this.caption!.innerText = figureData.caption;
                    this.detail!.innerText = figureData.detail;
                    this.log(JSON.stringify(figureData));
                }
            }
        } else {
            this.deselect();
        }
    }

    deselect() {
        if (this.selected) (this.selected.material as THREE.Material).opacity = 0;
        this.selected = null;
        this.displayCaption(false);
    }

    displayCaption(visible: boolean) {
        this.caption!.style.visibility = (visible) ? "visible" : "hidden";
    }

    displayDetail(visible: boolean) {
        this.detail!.style.visibility = (visible) ? "visible" : "hidden";
    }

    toggleDetail() {
        let state = this.detail!.style.visibility;
        this.detail!.style.visibility = (state == "visible") ? "hidden" : "visible";
    }

    log(text: string) {
        const element = document.createElement("div");
        element.innerText = (text);
        this.logElement?.prepend(element);
        console.log(text);
    }

    findFigure(tag: string): FigureData | null {
        for (const currentFigureData of this.muralData.figures) {
            if (currentFigureData.tag == tag) {
                return currentFigureData;
            }
        }
        return null;
    }

    // 8th Wall
    trackingStatus() { }

    wayspotFound({ detail }) {
        this.log("WAYSPOT FOUND:" + detail.name);

        this.log(detail.position);

        this.applyOffset(detail.name);

        this.origin.position.copy(detail.position);
        this.origin.quaternion.copy(detail.rotation)

        this.rootContainer.visible = true;
    }

    wayspotUpdated({ detail }) {
        this.log("WAYSPOT UPDATED");

        this.applyOffset(detail.name);

        this.origin.position.copy(detail.position);
        this.origin.quaternion.copy(detail.rotation)

        this.rootContainer.visible = true;
    }

    wayspotLost({ detail }) {
        this.log("WAYSPOT LOST");

        this.applyOffset(detail.name);

        this.origin.position.copy(detail.position);
        this.origin.quaternion.copy(detail.rotation)

        this.rootContainer.visible = false;
    }

    applyOffset(wayspotName: string) {

        if (wayspotName in this.wayspotData) {
            let data = this.wayspotData[wayspotName]

            this.rootContainer.position.copy(data.offset.position);
            let { x, y, z } = data.offset.rotation;
            this.rootContainer.rotation.set(x, y, z);
            this.rootContainer.scale.copy(data.offset.scale);
        }

    }

}

export default new App();