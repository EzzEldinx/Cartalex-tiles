import GeoJSON from 'ol/format/GeoJSON.js';
import VectorSource from 'ol/source/Vector.js';
import Map from 'ol/Map.js';
import View from 'ol/View.js';
import {Vector as VectorLayer} from 'ol/layer.js';
import OSM from 'ol/source/OSM.js';
import TileLayer from 'ol/layer/Tile.js'
import WMTS, {optionsFromCapabilities} from 'ol/source/WMTS.js'
import {altKeyOnly, click, shiftKeyOnly, singleClick} from 'ol/events/condition.js';
import Select from 'ol/interaction/Select.js'
import WMTSCapabilities from 'ol/format/WMTSCapabilities.js';
import {MousePosition, ScaleLine} from 'ol/control.js';
import Overlay from 'ol/Overlay.js';
import {toStringHDMS} from 'ol/coordinate.js';
import {toLonLat} from 'ol/proj.js';

import proj4 from 'proj4';

import Sortable from 'sortablejs';

import {styles_vecteurs} from './js/styles.js';
import { firstLetterUpperCase, isOnlyLetters, getShortest } from './js/utils.js';
import { getSitesFouillesInfos, getSitesFouillesAroundParcelles } from './js/server_api.js'

import './css/style.css';
import '../node_modules/ol/ol.css';
import { format } from 'ol/coordinate.js';
import { MapBrowserEvent } from 'ol';
import {register} from 'ol/proj/proj4';

import {Filter} from './Filter.mjs';
import {SubFilter} from './SubFilter.mjs';


const filters = [];

for (let filter_element of filters_config){
  let filter = new Filter(filter_element.name)
  for (let sub_filter_element of filter_element.sub_filters){
    let subfilter = new SubFilter(sub_filter_element.name, filter.name, sub_filter_element.request_options);
    await subfilter.initValues();
    filter.addSubFilter(subfilter)
  }
  filters.push(filter)
}

  /*---------------------------------------------------------------------------URLs Initialisation*/
  const urlWMTSGetCapabilities = 'http://myqgisserver/cgi-bin/qgis_mapserv.fcgi/?' //To QGIS Server WMTS Service
    +'SERVICE=WMTS'
    +'&REQUEST=GetCapabilities'
    +'&MAP=/home/qgis/projects/projet_qgis_cealex_basileia_dev.qgz';
  /*---------------------------------------------------------------------------Dom Elements*/
  
  proj4.defs('EPSG:22992', '+proj=tmerc +lat_0=30 +lon_0=31 +k=1 +x_0=615000 +y_0=810000 +ellps=helmert +towgs84=-130,110,-13,0,0,0,0 +units=m +no_defs')
  register(proj4)

  /*---Initialasing GetCapabilities content*/
  const wmts_capabilities = await loadWMTSGetCapabilities();

  var wmts_layers = getWmtsLayers();
  var wfs_layers = await getWfsLayers();

  const layers = await setLayers();
  const criteresSitesFouilles = await setCriteresSitesFouilles();
  var selectedSitesFouilles = [];
  var selectedParcellesRegion = [];

  console.log("LAYERS", layers)
  console.log("CRITERES", criteresSitesFouilles)

  fillLayerMenu();
  fillDropDownMenu();

  setInputNumbers()
  document.getElementById('checkboxDates').addEventListener('change', onChangeCheckBoxDates);
  document.getElementById('datesButton').addEventListener('click', updateSitesFouillesLayer)
  
  const container = document.getElementById('popup');
  const content = document.getElementById('popup-content');

  const overlay = new Overlay({
    element: container,
    autoPan: {
      animation: {
        duration: 250,
      },
    },
  });

  const map = new Map({
    target: 'map',
    layers: [],
    overlays: [overlay],
    view: new View({
      center: [29, 31],
      projection: 'EPSG:4326',
      zoom: 12
    })
  });

  map.on("click", onClickMap)
  
  var select = new Select({
    style: styles_vecteurs['sitesFouilles']['selected']
  })

  map.addInteraction(select);
  select.on('select', async function (evt) {
    if (evt.selected.length){
      const coordinate = evt.selected[0].getGeometry().getCoordinates();
      var infos = await getSitesFouillesInfos(evt.selected[0].values_.id)
      console.log("Site sélectionné : ", infos)
      content.innerHTML = `<a href=${evt.selected[0].values_.url_geonames} target="_blank">AAA${evt.selected[0].values_.url_geonames}</a>`;
      overlay.setPosition(coordinate);
    } else {
      overlay.setPosition(undefined);
    }
  });

  ///select.on('select', (evt) => onChangeSelect(evt));
 
  async function setLayers(){
    var layers = wfs_layers.filter(layer => layer.name != "parcellesRegion").concat(wmts_layers);
    layers.forEach(async layer => {
      if (layer.flux == 'wmts'){
        let wmts_layer = new TileLayer({
          source: new WMTS(await setWMTSOptions(layer.name))
        })

        if (layer.name == "parcellesRegion"){
          layer.relativeWFSLayers = new VectorLayer({
            source: new VectorSource({
              format: new GeoJSON(),
              url: 'http://myqgisserver/cgi-bin/qgis_mapserv.fcgi/?' //To QGIS Server WFS Service
              +'SERVICE=WFS'
              +'&version=1.1.0'
              +'&REQUEST=GetFeature'
              +'&OUTPUTFORMAT=application/json'
              +'&SRSNAME=EPSG:22992'
              +`&TYPENAME=parcellesRegion`
              +`&FEATUREID=parcellesRegion.0,`
            }),
            style: styles_vecteurs[layer.name]['intersects']
          })
        }

        layer.layer = wmts_layer;

      } else if (layer.flux == 'wfs'){
        let wfs_layer = new VectorLayer({
          source: new VectorSource({
            format: new GeoJSON(),
            url: 'http://myqgisserver/cgi-bin/qgis_mapserv.fcgi/?' //To QGIS Server WFS Service
            +'SERVICE=WFS'
            +'&version=1.1.0'
            +'&REQUEST=GetFeature'
            +'&OUTPUTFORMAT=application/json'
            +'&SRSNAME=EPSG:22992'
            +`&TYPENAME=${layer.name}`
            +`&FEATUREID=`
          }),
          name: layer.name
        })
        if (layer.name in styles_vecteurs){
          console.log("Le style existe : ", styles_vecteurs)
          wfs_layer.setStyle(styles_vecteurs[layer.name]['no_selection'])
        }
        layer.layer = wfs_layer;
      }
    })
    return layers
  }
  
  /*---------------------------------------------------------------------------Map Settings*/

  async function getCriteres(getRequest, fields){
    const result = await fetch(`http://localhost:3000/${getRequest}?fields=${fields.join(',')}`)
    const json_result = await result.json();
    return json_result
  }  

  /*---------------------------------------------------------------------------Map Object*/
  const scaleLine = new ScaleLine({
    units: 'metric',
  })
  var mousePosition = new MousePosition({
    className: 'mousePosition',
    projection: 'EPSG:4326',
    coordinateFormat: function(coordinate){return format(coordinate, '{x}, {y}', 6)}
  })
  map.addControl(mousePosition);
  map.addControl(scaleLine);


  /*---------------------------------------------------------------------------Load Features Functions*/
  async function loadWMTSGetCapabilities(){
    /**
     * Load WMTS GetCapabilities response from QGIS Server
     */
    const parser = new WMTSCapabilities();
    let responseCapabilities = await fetch(urlWMTSGetCapabilities);
    let textCapabilites = await responseCapabilities.text();
    const resultCapabilites = parser.read(textCapabilites);

    return resultCapabilites;
  }
  
  /*---------------------------------------------------------------------------Fill Menus Functions*/

  async function fillDropDownMenu(){
    var volet_haut = document.getElementById("volet_haut")
  
    for (let filter of filters){
      volet_haut.innerHTML += `<div class="dropDownFilter" ${filter.name}>`
        + `<button class="dropbtnTitle" onclick="onClickDropBtnTitle()">${firstLetterUpperCase(filter.name)}</button>`
        + `<div class="dropDownSubFilter">`
    
        for (let subfilter of filter.getSubFilters()){
          volet_haut.innerHTML += `<button class="dropbtn" onclick="onClickDropBtn">${firstLetterUpperCase(subfilter.alias).replace('_', ' ')}</button>`
          + `<ul class="dropDownMenu">`
          + `<li><input type="checkbox" value="checkall" onchange="onChangeCheckAllCheckBox">`
          + `<label for="checkall">Cocher tout</label></li>`
    
          for (let value of subfilter.getValues()){
            volet_haut.innerHTML += `<li><input type="checkbox" subFilter=${subfilter.name} filter=${filter.name} value=value onchange="onChangeSubFilterCheckBox">`
            + `<label for=value>${firstLetterUpperCase(value)}</label></li>`
          }
    
          volet_haut.innerHTML += `</ul>`
        }
        volet_haut.innerHTML += `</div></div>`
    }
  }
  
  async function fillLayerMenu(){
    layers.forEach(layer => {
      var menu = document.getElementById('items');
      var firstParent = document.createElement('li');
      firstParent.classList.add('listitem');
      var secondChild = document.createElement('input');
      secondChild.type = "checkbox";
      secondChild.name = layer.name;
      secondChild.flux = layer.flux; 
      var thirdChild = document.createElement('label');
      thirdChild.for = layer.name;
      thirdChild.innerHTML = layer.title
      thirdChild.classList.add('itemLabel')

      secondChild.addEventListener('click', onChangeLayerCheckBox);

      firstParent.appendChild(secondChild);
      firstParent.appendChild(thirdChild);
      menu.appendChild(firstParent);
    })
    
    var el = document.getElementById('items');
    var sortable = Sortable.create(el, {
      animation: 300,
      ghostClass: 'blue-background-class',
      onEnd: onChangeLayerMenu
    });

  }
  
  function getWmtsLayers() {
    var wmts_layers = [];
    //Fill the array
    let wmts_list = wmts_capabilities['Contents']['Layer'];
    wmts_list.forEach(layer => {
      wmts_layers.push({
        name:layer['Identifier'], 
        title: layer['Title'],
        type: 'Raster',
        flux: 'wmts',
        checked: false
      });
    })
    console.log("WMTS layers : ", wmts_layers);
    return wmts_layers
  }
  
  async function getWfsLayers(){
    var wfs_layers = [];
    const result = await fetch(`http://localhost:3000/getWfsLayers`)
    const featureTypeList = await result.json();
    console.log("FeatureList : ", featureTypeList)
    featureTypeList.forEach(element => {
      element.FeatureType.forEach(layer => {
        wfs_layers.push({
          name: layer['Name'].toString(),
          title: layer['Title'].toString(),
          type: 'Vector',
          flux: 'wfs',
          checked: false
        })
      })
    })
    return wfs_layers
  }

  /*---------------------------------------------------------------------------Raster Function*/
  async function setWMTSOptions(rasterName) {
    const options = optionsFromCapabilities(wmts_capabilities, {
      layer: rasterName,
      projection: 'EPSG:22992',
      matrixSet: 'EPSG:22992',
    });
    return options
  }
  
  /*---------------------------------------------------------------------------Vector Functions*/
  async function updateSitesFouillesLayer() {
    /*
     * Update siteFouillesLayer with new criteres
     
    */
   console.log("Mise à jour des sites de la sélection sur les sites de fouilles...")

   var urlSitesFouillesWFS = 'http://myqgisserver/cgi-bin/qgis_mapserv.fcgi/?' //To QGIS Server WFS Service
    +'SERVICE=WFS'
    +'&version=1.1.0'
    +'&REQUEST=GetFeature'
    +'&OUTPUTFORMAT=application/json'
    +'&SRSNAME=EPSG:22992'
    +`&TYPENAME=sitesFouilles`
    +`&FEATUREID=`;
    
    var sitesFouillesLayer = layers.filter(layer => layer.name == 'sitesFouilles' && layer.flux == 'wfs')[0];
    var sitesFouilles_index = layers.indexOf(sitesFouillesLayer)
    
    var idFouillesAllCriteres = [];

    for (let critere of criteresSitesFouilles){
    
      let idFouillesCritere = [];
      var requestApiUrl = `http://localhost:3000/sitesFouilles`;
      critere.active = false;

      for (let sub_critere of critere.sub_criteres){
        let selected_values = sub_critere.values.filter(value => value.checked == true);
        console.log("Valeurs sélectionnées : ", selected_values)

        if (selected_values.length){
          console.log("Sous-critere actif", sub_critere)
          
          if (!critere.active){
            critere.active = true;
            requestApiUrl += `/${critere.name}/?`;
          }

          sub_critere.active = true;

          requestApiUrl += `&${sub_critere.name}=`;
  
          selected_values.forEach(value => {
            requestApiUrl += `${value.value}|`
          })

          console.log("Requete de filtre: ", requestApiUrl);
        }
      }

      const result = await fetch(requestApiUrl);
          const json_result = await result.json();//Content of the response
          for(let site of json_result){
            idFouillesCritere.push(site.id);
          }
      idFouillesAllCriteres.push(idFouillesCritere)
    }

    if (document.getElementById('checkboxDates').checked == true){
      var idDates = await checkDates()
      idFouillesAllCriteres.push(idDates)
    }
    
    let activeLayers = layers.filter(layer => layer.checked == true);
    if (activeLayers.length){
      if (activeLayers[0].name == 'parcellesRegion' && activeLayers[0].flux == 'wmts'){
        if (activeLayers[0].relativeWFSLayers.visible == true){
          var idAroundParcelles = await getSitesFouillesAroundParcelles(100, selectedParcellesRegion)
          let idAroundParcellesArray = []
          for (let obj of idAroundParcelles){
            idAroundParcellesArray.push(obj.id)
          }
          idFouillesAllCriteres.push(idAroundParcellesArray)
        }
      }
    }
    
    
    let id_fouilles = [];
    console.log("les id retenus par critere", idFouillesAllCriteres)
    let sorted_idFouillesByCritere = getShortest(idFouillesAllCriteres);
    console.log("Les arrays filtrés : ", sorted_idFouillesByCritere)

    for (let id of sorted_idFouillesByCritere.shortest){
      console.log("ID : ", id)
      if (sorted_idFouillesByCritere.else_array.filter(array => array.includes(id) && array.length > 0).length == sorted_idFouillesByCritere.else_array.filter(array => array.length > 0).length){
        id_fouilles.push(id)
      }
    }

          //Create GET request to QGIS Server WFS Service
    for (let id of id_fouilles){
      urlSitesFouillesWFS += `sitesFouilles.${id},` //Add the object to filter sitesFouillesLayer from project API response
    }

    console.log("requete Qgis", urlSitesFouillesWFS)

      if (layers[sitesFouilles_index].checked == true){
        let checked_layers = layers.filter(layer => layer.checked == true).reverse()
        let index = checked_layers.indexOf(layers[sitesFouilles_index])

        layers[sitesFouilles_index].layer.getSource().setUrl(urlSitesFouillesWFS)
        map.getLayers().getArray()[index].setSource(
          new VectorSource({
            format: new GeoJSON(),
            url: urlSitesFouillesWFS
          })
        )
        if (id_fouilles.length == 0){
          map.getLayers().getArray()[index].setStyle(styles_vecteurs['sitesFouilles']['no_selection'])
        }else{
          map.getLayers().getArray()[index].setStyle(styles_vecteurs['sitesFouilles']['selection'])
        }
        
      }else{
        if (criteresSitesFouilles.filter(critere => critere.active == true).length){
          layers[sitesFouilles_index].layer.setStyle(styles_vecteurs['sitesFouilles']['selection'])
        } else {
          layers[sitesFouilles_index].layer.setStyle(styles_vecteurs['sitesFouilles']['no_selection'])
        }
        layers[sitesFouilles_index].layer.getSource().setUrl(urlSitesFouillesWFS)
      }

    }

    function updateParcellesRegion(){

      var parcellesRegionWMTS = layers.filter(layer => layer.name == 'parcellesRegion' && layer.flux == 'wmts')[0]
      var index_parcelleRegionWMTS = layers.indexOf(parcellesRegionWMTS)

      let urlParcellesRegionsWFS = parcellesRegionWMTS.relativeWFSLayers.getSource().getUrl()

      console.log("Selected parcelles", selectedParcellesRegion)

      for (let id of selectedParcellesRegion){
          urlParcellesRegionsWFS += `parcellesRegion.${id},`
      }
      console.log("Nouvel url parcelles_regions WFS : ", urlParcellesRegionsWFS)

      layers[index_parcelleRegionWMTS].relativeWFSLayers.getSource().setUrl(urlParcellesRegionsWFS)

      let checked_layers = layers.filter(layer => layer.checked == true).reverse()
      let wmts_map_index = checked_layers.indexOf(layers[index_parcelleRegionWMTS]);

      console.log("Relative layer : ", layers[index_parcelleRegionWMTS].relativeWFSLayers)

      let new_relative_index = wmts_map_index + 1;
      console.log("finally : ", new_relative_index, layers[index_parcelleRegionWMTS].relativeWFSLayers)
      console.log(map.getLayers())
      map.getLayers().getArray()[1].setSource(new VectorSource({
        format: new GeoJSON,
        url: urlParcellesRegionsWFS
      }))
    }
    
  
  
  /*---------------------------------------------------------------------------Notice function*/

  async function onChangeSelect(evt){


    console.log("Evenement déclenché : ", evt)

    for(let selected_feature of evt.selected){
      console.log("Element sélectionné", selected_feature)
      await addItemInfo(selected_feature)
    }
    for(let deselected_feature of evt.deselected){
      removeItemInfo(deselected_feature);
    }
    console.log('terminé')

  }

  async function checkDates(){
    let id_fouilles = []
    let date_debut = document.getElementById('inputDateDebut').value
    let date_fin = document.getElementById('inputDateFin').value

    if(!date_debut || !date_fin){
      return
    }

    let result = await fetch(`http://localhost:3000/sitesFouilles/datations/dates?&date_debut=${date_debut}&date_fin=${date_fin}`)
    let result_json = await result.json()

    if(!result_json){
      return []
    } else {
      for(let site of result_json){
        id_fouilles.push(site.id);
      }
    }
    return id_fouilles
  }

  async function addItemInfo(selected_feature){

    var id = selected_feature.getId().slice(selected_feature.getId().indexOf('.')+1)
    console.log("ID sélectionné ", id)

    let requestApiUrl = "http://localhost:3000/sitesFouilles/getInfo?id="
    const result = await fetch(requestApiUrl+id)
    const infos = await result.json()
    
    const menu = document.getElementById('menuInfo')
    var item = document.createElement('li')
    item.id = "sitesFouilles-item." + infos.id
    var table = document.createElement('table')
    table.id = "sitesFouilles." + infos.id
    table.innerHTML =
    `
    <thead>
      <tr>
        <th colspan="2" class="tableLabel">Site de fouilles n°${infos.id}</th>
      </tr>
    </thead>
    <tbody class="tableBody">
      <tr>
        <td>Localisation détaillée</td>
        <td>${infos.localisation_detaillee}</td>
      </tr>
      <tr>
        <td>Coordonnées WGS84 (lon, lat)</td>
        <td>(${infos.lon_wgs84}, ${infos.lat_wgs84})</td>
      </tr>
      <tr>
        <td>Référence Tkaczow</td>
        <td>${infos.num_tkaczow}</td>
      </tr>
    </tbody>
    `
    table.classList.add('selectedTable')
    table.classList.add('tableInfos')
    table.firstElementChild.addEventListener('click', onClickTableElement)
    item.appendChild(table)
    menu.appendChild(item)
  }

  function removeItemInfo(deselected_feature){
    var id = deselected_feature.getId().slice(deselected_feature.getId().indexOf('.')+1)
    document.getElementById(`sitesFouilles-item.${id}`).outerHTML = "";
  }

  async function getIntersectParcelles(selected_feature){

    var id = selected_feature.getId().slice(selected_feature.getId().indexOf('.')+1)
    console.log("ID sélectionné ", id)

    let requestApiUrl = `http://localhost:3000/getParcelles?sitesId=${id}` 
    const result = await fetch(requestApiUrl)
    const id_parcelles = await result.json()

    console.log("Id des parcelles intersects : ", id_parcelles)
    return id_parcelles
  }

  function onClickTableElement(evt){
    const item = evt.currentTarget;
    console.log("Item clické : ", item)
    const tbody = item.nextElementSibling;
    tbody.classList.toggle("showTable")
  }

  function onChangeLayerCheckBox(evt){
    let result = layers.filter(layer => layer.name == evt.currentTarget.name && layer.flux == evt.currentTarget.flux)
    
    let index = layers.indexOf(result[0])

    if (evt.currentTarget.checked){
      layers[index].checked = true;

      let checked_layers = layers.filter(layer => layer.checked == true).reverse()
      let new_index = checked_layers.indexOf(result[0]);
      map.getLayers().insertAt(new_index, result[0].layer)

      if(evt.currentTarget.name == 'parcellesRegion' && evt.currentTarget.flux == 'wmts'){
        console.log("Relative layer : ", layers[index].relativeWFSLayers)
        let new_relative_index = new_index + 1
        map.getLayers().insertAt(new_relative_index, layers[index].relativeWFSLayers)
        layers[index].relativeWFSLayers.visible = true;
      }

      
    }else{
      layers[index].checked = false;
      map.getLayers().remove(result[0].layer);

      if(evt.currentTarget.name == 'parcellesRegion' && evt.currentTarget.flux == 'wmts'){
        map.getLayers().remove(evt.currentTarget.relativeWFSLayers)
      }
    }

  }

  function onChangeLayerMenu(evt){
    //MAJ de l'ordre
    let element = layers.splice(evt.oldIndex, 1)[0];
    layers.splice(evt.newIndex, 0, element);

    let result = layers.filter(layer => layer.checked == true).reverse()
    map.setLayers([])

    result.forEach(element => {
      map.addLayer(element.layer)
    })
    console.log("nouvel ordre", layers)
  }

  function onChangeSubFilterCheckBox(evt){
    console.log('target', evt.currentTarget)
    //Find critere
    let critereObject = criteresSitesFouilles.filter(critere =>  critere.name == evt.currentTarget.critere)
    let critereIndex = criteresSitesFouilles.indexOf(critereObject[0])
    console.log("Critere : ", critereObject[0])
    //Find subcritere
    let subCritereObject = criteresSitesFouilles[critereIndex].sub_criteres.filter(sub_critere => sub_critere.name == evt.currentTarget.sub_critere);
    let subCritereIndex = criteresSitesFouilles[critereIndex].sub_criteres.indexOf(subCritereObject[0]);
    console.log("Sous critere : ", subCritereObject[0])
    //Find value
    let valueObject = criteresSitesFouilles[critereIndex].sub_criteres[subCritereIndex].values.filter(value => value.value == evt.currentTarget.value)
    let valueIndex = criteresSitesFouilles[critereIndex].sub_criteres[subCritereIndex].values.indexOf(valueObject[0])

    console.log("Valeur : ", criteresSitesFouilles[critereIndex].sub_criteres[subCritereIndex].values[valueIndex])
    
    if (evt.currentTarget.checked){
      criteresSitesFouilles[critereIndex].sub_criteres[subCritereIndex].values[valueIndex].checked = true;
    }else{
      criteresSitesFouilles[critereIndex].sub_criteres[subCritereIndex].values[valueIndex].checked = false;
    }
    let selected_values = criteresSitesFouilles[critereIndex].sub_criteres[subCritereIndex].values.filter(value => value.checked == true);
    console.log("Cases cochées : ", selected_values)

    updateSitesFouillesLayer()
    
  }
  /*---------------------------------------------------------------------------onChangeCriteres function*/
  function onClickDropBtn(evt){
    console.log("Alert")
    let dropDownMenu = evt.currentTarget.nextElementSibling;
    dropDownMenu.classList.toggle("showDrop")
    evt.currentTarget.classList.toggle("dropbtnAppears")
  }
  function onClickDropBtnTitle(evt){
    console.log("Alert title")
    let divParent = evt.currentTarget.parentElement;
    let dropbtnList = document.querySelectorAll(`#${divParent.id} .dropDownFilter`)
    dropbtnList.forEach(dropbtn => {
      dropbtn.classList.toggle("showDrop")  
    })
  }

  async function setInputNumbers(){
    var inputNumbersDebut = document.getElementById('inputDateDebut')
    var inputNumbersFin = document.getElementById('inputDateFin')

    var maxMin = await getMaxDateDebut()
    console.log(maxMin)
    inputNumbersDebut.max = maxMin[0].max
    inputNumbersDebut.min = maxMin[0].min
    inputNumbersDebut.value = "0"

    inputNumbersFin.max = maxMin[1].max
    inputNumbersFin.min = maxMin[1].min
    inputNumbersFin.value = "0"

  }

  async function getMaxDateDebut(){
    let result = await fetch('http://localhost:3000/datations/getMinMax?fields=date_debut,date_fin')
    let result_json = await result.json()
    return result_json
  }

  function onChangeCheckBoxDates(evt){
    let checkbox = evt.currentTarget;
    if(checkbox.checked){
      document.getElementById("datesButton").disabled = false;
    } else {
      document.getElementById("datesButton").disabled = true;
    }

    updateSitesFouillesLayer()

  }

  function onChangeCheckAllCheckBox(evt){
    console.log(evt)
    var dropDownMenu = (evt.currentTarget.parentElement.parentElement)
    console.log(dropDownMenu)
    let array = Array.from(dropDownMenu.childNodes)
    console.log(array)
    for(var node of array.slice(0)){
      var checkbox = node.firstElementChild
      console.log(checkbox)

      if(evt.currentTarget.checked == true){
        checkbox.checked = true
      } else {
        checkbox.checked = false
      }
      checkbox.dispatchEvent(new Event("change"))
    }
    
  }

  async function onClickMap(evt){
    var mapEvent = evt.originalEvent;
    console.log("First fired event : ", mapEvent)

    let activeLayers = layers.filter(layer => layer.checked == true)
    if (activeLayers.length == 1 && activeLayers[0].name == 'parcellesRegion' && activeLayers[0].flux == 'wmts'){
      let coordinates_22992 = map.getEventCoordinate(mapEvent)
      let coordinates_4326 = proj4('EPSG:22992', 'EPSG:4326').forward(coordinates_22992)
      console.log("Hit this coordinates : ", coordinates_4326)

      var result = await fetch(`http://localhost:3000/parcellesRegion/getParcelleAt?lat=${coordinates_4326[0]}&lon=${coordinates_4326[1]}`)
      var selected_parcelles = await result.json()
      selectedParcellesRegion.push(selected_parcelles[0].id)
      console.log("Hit this parcelle : ", selected_parcelles)

      console.log("Layers state : ", layers)
      updateParcellesRegion();
      updateSitesFouillesLayer();

    }
    
  }
  /*---------------------------------------------------------------------------addEventListener*/

/*
  function onChangeLayerCheckBox(evt){
    let result = layers.filter(layer => layer.name == evt.currentTarget.name && layer.flux == evt.currentTarget.flux)
    
    let index = layers.indexOf(result[0])

    if (evt.currentTarget.checked){
      layers[index].checked = true;

      let checked_layers = layers.filter(layer => layer.checked == true).reverse()
      let new_index = checked_layers.indexOf(result[0]);
      map.getLayers().insertAt(new_index, result[0].layer)

      if(evt.currentTarget.name == 'parcellesRegion' && evt.currentTarget.flux == 'wmts'){
        console.log("Relative layer : ", layers[index].relativeWFSLayers)
        let new_relative_index = new_index + 1
        map.getLayers().insertAt(new_relative_index, layers[index].relativeWFSLayers)
        layers[index].relativeWFSLayers.visible = true;
      }

      
    }else{
      layers[index].checked = false;
      map.getLayers().remove(result[0].layer);

      if(evt.currentTarget.name == 'parcellesRegion' && evt.currentTarget.flux == 'wmts'){
        map.getLayers().remove(evt.currentTarget.relativeWFSLayers)
      }
    }

  }
  */