import VectorSource from 'ol/source/Vector.js';
import GeoJSON from 'ol/format/GeoJSON';
import VectorLayer from 'ol/layer/Vector';
import { getInfosFromWFSLayer } from './server_api';
import { getBiblioFromWFSLayer } from './server_api';
import { getVestigesFromWFSLayer } from './server_api';
import {styles_vecteurs} from './styles'

export class LayerWFS {
    constructor(capabilities, project_settings){
        this.name = capabilities["Name"];
        this.title = capabilities["Title"];
        this.SRC = capabilities["DefaultSRS"];
        this.active = false;
        this.flux = 'wfs';
        this.attribution = project_settings["Attribution"] ? project_settings["Attribution"]["Title"].split(','): undefined;
        console.log(project_settings);
        this.keywords = project_settings["KeywordList"]["Keyword"];
        this.type = this.keywords.length > 1 ? this.keywords[0] : this.keywords;
        this.role = this.keywords.length > 1 ? this.keywords[1] : undefined;
        this.abstract = project_settings["Abstract"];
        this.getFeatureUrl = capabilities.getFeatureUrl
        
        this.olLayer = new VectorLayer({
            source: new VectorSource({
                format: new GeoJSON(),
                url: this.getFeatureUrl
            }),
        });
        // console.log(this.name)
        
        if (styles_vecteurs[this.name]){
        if (this.name === "nomsRues"){
                // console.log(this.olLayer)
            // this.olLayer.setStyle((this.olLayer) => styles_vecteurs[this.name]['showLabel'](this))
            //this.olLayer.setStyle(styles_vecteurs[this.name]['showLabel'])
            
            // this.olLayer.setStyle((feature) => {
            //     return styles_vecteurs[this.name]['showLabel'](feature);
            // });
            //this.olLayer.setStyle((feature) => { return styles_vecteurs[this.name]['showLabel'](feature)});
            this.olLayer.setStyle((feature) => { return styles_vecteurs[this.name]['showLabel'](feature)});

        }
        else(   
            this.olLayer.setStyle(styles_vecteurs[this.name]['no_selection'])
        )
        }
        // if (styles_vecteurs[this.name]){
        //     if(this.name = "nomsRues"){
        //         console.log('Rule for nomsRues');
        //         this.olLayer.setStyle(styles_vecteurs[this.name]['showLabel'])
        //     } 
        //     else{
        //         console.log('Not nomsRues');
        //         this.olLayer.setStyle(styles_vecteurs[this.name]['no_selection'])
        //     }
        
        // }
        
        

const source = this.olLayer.getSource();

// Afficher un spinner au début du chargement
source.on('featuresloadstart', () => {
  document.getElementById(this.name + "-spinner").style.display = "flex";
});

// Cacher le spinner à la fin
source.on('featuresloadend', () => {
  document.getElementById(this.name + "-spinner").style.display = "none";
});

// Gérer une erreur de chargement
source.on('featuresloaderror', () => {
  document.getElementById(this.name + "-spinner").style.display = "none";
  console.error("Erreur lors du chargement WFS");
});


    }

    getOlLayer(){
        return this.olLayer;
    }

    setActive(state){
        this.active = state;
    }

    getActive(){
        return this.active;
    }

    async updateOlLayer(filterCollection){
        let filtered_ids = await filterCollection.getFilteredIds();
        this.selected_features = filtered_ids;
        if(typeof filtered_ids !== 'undefined'){
            if (filtered_ids.length){
                console.log("Features Ids to keep : ", filtered_ids);
                let new_url = this.getFeatureUrl + '&FEATUREID=';
                for (let id of filtered_ids){
                    new_url += `${this.name}.${id},`
                }
                this.olLayer = new VectorLayer({
                    source: new VectorSource({
                        format: new GeoJSON(),
                        url: new_url
                    })
                })
                if (styles_vecteurs[this.name]){
                    this.olLayer.setStyle(styles_vecteurs[this.name]['selection'])
                }
            } else {
                this.olLayer = new VectorLayer({
                    source: new VectorSource({
                        format: new GeoJSON()
                    })
                })
            }
        } else {
            this.olLayer = new VectorLayer({
                source: new VectorSource({
                    format: new GeoJSON(),
                    url: this.getFeatureUrl
                })
            });
            if (styles_vecteurs[this.name]){
                this.olLayer.setStyle(styles_vecteurs[this.name]['no_selection'])
            }
        }
        
        
    }

    isInitial(){
        if(typeof this.role !== 'undefined'){
            console.log("Role is defined");
            return  this.role == 'initial' ? true : false;
        } else{
            console.log("No role.")
            return false;
        }
    }

    setSelectedStyle(){
        if (styles_vecteurs[this.name]){
            this.olLayer.setStyle(styles_vecteurs[this.name]['selected']);
        }
    }

    getSelectedFeatures(){
        return this.selected_features;
    }

    async getInfos(selected_features){
        let infos = await getInfosFromWFSLayer(this, selected_features);
        return infos;
    }
    async getBiblioFromSite(selected_features){
        let infos = await getBiblioFromWFSLayer(this, selected_features);
        return infos;
    }
    async getVestigesFromSite(selected_features){
        let infos = await getVestigesFromWFSLayer(this, selected_features);
        return infos;
    }
}