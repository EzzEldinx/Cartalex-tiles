import {server_config} from './server_config.js';

/*
export async function getSitesFouillesAroundParcelles(radius, selectedParcellesRegion){
  var result = await fetch(server_config.serverHttpAt + `/sitesFouilles/aroundParcelles?&radius=${radius}&id_parcelles=${selectedParcellesRegion.join(',')}`);
  var result_json = await result.json()
  return result_json
}
*/

export async function getValuesFromSubFilter(subfilter){
  let http_request = server_config.api_at + `/getValues/${subfilter.filter_name}?field=${subfilter.name}`;
  for (let [key, value] of Object.entries(subfilter.request_options)){
    http_request += `&${key}=${value}`;
  }
  let result_values = await fetch(http_request)
  let json_values = await result_values.json()
  return json_values
}

export async function getInfosFromWFSLayer(wfs_layer, selected_features){
  let http_request = server_config.api_at + `/getInfos/${wfs_layer.name}?&id=`;
  for (let id of selected_features){
    http_request += id;
  }
  let result_infos = await fetch(http_request)
  let json_infos = await result_infos.json()
  return json_infos
}

export async function getBiblioFromWFSLayer(wfs_layer, selected_features){
  let http_request = server_config.api_at + `/sitesFouilles/bibliographies/?&id=`;
  for (let id of selected_features){
    http_request += id;
  }
  let result_infos = await fetch(http_request)
  let json_infos = await result_infos.json()
  return json_infos
}

export async function getVestigesFromWFSLayer(wfs_layer, selected_features){
  let http_request = server_config.api_at + `/sitesFouilles/vestiges/?&id_site=`;
  for (let id of selected_features){
    http_request += id;
  }
  let result_infos = await fetch(http_request)
  let json_infos = await result_infos.json()
  return json_infos
}