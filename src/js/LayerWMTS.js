import { optionsFromCapabilities } from "ol/source/WMTS";
import WMTS from "ol/source/WMTS";
import TileLayer from "ol/layer/Tile";

export class LayerWMTS{
    constructor(capabilities, project_settings){
        console.log(project_settings);
        this.name = capabilities["ows:Identifier"];
        this.title = capabilities["ows:Title"];
        this.SRS = capabilities["TileMatrixSetLink"]["TileMatrixSet"];
        this.attribution = project_settings["Attribution"] ? project_settings["Attribution"]["Title"].split(','): undefined;
        this.keywords = project_settings["KeywordList"]["Keyword"];
        this.type = this.keywords.length > 1 ? this.keywords[0] : this.keywords;
        this.role = this.keywords.length > 1 ? this.keywords[1] : undefined;
        this.abstract = project_settings["Abstract"];
        this.olLayer = new TileLayer({
            source: new WMTS(optionsFromCapabilities(capabilities.olGetCapabilities, {
                layer: this.name,
                projection: this.SRS,
                matrixSet: this.SRS
                //,
                //format: "image/jpeg"
                })
            )
        });

        const tileSource = this.olLayer.getSource();

        tileSource.on('tileloadstart', () => {
        document.getElementById(this.name + "-spinner").style.display = "flex";
        });

        tileSource.on('tileloadend', () => {
        document.getElementById(this.name + "-spinner").style.display = "none";
        });

        tileSource.on('tileloaderror', () => {
        document.getElementById(this.name + "-spinner").style.display = "none";
        console.error("Erreur de chargement WMS tile");
        });


        this.flux = 'wmts';
        this.active = false;
    }

    getName(){
        return this.name;
    }

    getOlLayer(){
        return this.olLayer;
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
}