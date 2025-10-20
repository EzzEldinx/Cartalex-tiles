import { getWfsLayersCapabilities, getWmtsLayersCapabilities, getWmsProjectSettings } from "./qgsserver_api";
import { LayerWFS } from "./LayerWFS";
import { LayerWMTS } from "./LayerWMTS";
export class LayerCollection{
    constructor(projectSettings){
        this.projectSettings = projectSettings;
        this.layers = [];
    };

    async initLayers(){
        this.layersSettings = this.projectSettings["Capability"]["Layer"]["Layer"];
        var initialOrder = this.projectSettings["Capability"]["LayerDrawingOrder"].split(',').reverse();
        await this.initWfsLayers();
        await this.initWmtsLayers();
        //Initialisation of relative layers
        console.log("Project settings : ", this.projectSettings)
        for (let wmtsLayer of this.wmtsLayers){
            let relativeWfsLayer = this.wfsLayers.filter(wfsLayer => wfsLayer.name == wmtsLayer.name )[0];
            if (relativeWfsLayer){
                wmtsLayer.relativeWfsLayer = relativeWfsLayer;
                this.wfsLayers = this.wfsLayers.filter(wfsLayer => wfsLayer.name != relativeWfsLayer.name);
            }
            this.addLayer(wmtsLayer)
        }
        for (let wfsLayer of this.wfsLayers){
            this.addLayer(wfsLayer);
        }
        this.reorder(initialOrder);
    }

    async initWfsLayers(){
        this.wfsLayers = [];
        for (let wfsLayerCapability of await getWfsLayersCapabilities()){
            let layerProjectSettings = this.layersSettings.filter(layer => layer["Name"] == wfsLayerCapability["Name"])[0];
            this.wfsLayers.push((new LayerWFS(wfsLayerCapability, layerProjectSettings)));
        }        
    };

    async initWmtsLayers(){
        this.wmtsLayers = [];
        for (let wmtsLayerCapability of await getWmtsLayersCapabilities()){
            let layerProjectSettings = this.layersSettings.filter(layer => layer["Name"] == wmtsLayerCapability["ows:Identifier"])[0];
            console.log(this.layersSettings);
            console.log(wmtsLayerCapability["ows:Identifier"]);
            console.log(layerProjectSettings);
            this.wmtsLayers.push(new LayerWMTS(wmtsLayerCapability, layerProjectSettings));
        }
    }

    activeInitialLayers(){
        for(let layer of this.layers){
            layer.role == 'initial' ? layer.active = true : false;
        }
    }

    reorder(new_order){
        let layers = new Array(this.layers.length).fill(0);
        for (let layer of this.layers){
            layers.splice(new_order.indexOf(layer.name), 1, layer);
        }
        this.layers = layers;
    }

    addLayer(layer){
        this.layers.push(layer);
    }
    
    getLayers(){
        return this.layers;
    }

    getLayer(layerName){
        return this.layers.filter(layer => layer.name == layerName)[0];
    }

    getActiveLayers(){
        return this.layers.filter(layer => layer.active == true);
    }

    getPrimaryLayer(){
        return this.layers.filter(layer => layer.type == 'primary')[0];
    }


}