import {Circle, Fill, Stroke, Style, Text} from 'ol/style.js';

export const sites_fouilles = {
  'no_selection' : new Style({
    // text: "aaa",//feature.get('nom_rue') || '', // Remplace "nom_rue" par ton champ réel
    //     font: 'bold 12px Arial',

    image: new Circle({
      fill: new Fill({
        color: 'rgba(9, 156, 230, 0.6)',
      }),
      stroke: new Stroke({
        color: '#0C3F59',
        width: 1.5,
      }),
      radius: 5,
    }),
  }),
  'selection' : new Style({
    // text: "aaa",//feature.get('nom_rue') || '', // Remplace "nom_rue" par ton champ réel
    //     font: 'bold 12px Arial',

    image: new Circle({
      fill: new Fill({
        color: 'rgba(11, 106, 26, 0.6)',
      }),
      stroke: new Stroke({
        color: '#056B0F',
        width: 1.5,
      }),
      radius: 7,
    }),
  }),
  'selected' : new Style({
    
    image: new Circle({
      fill: new Fill({
        color: 'rgba(230, 200, 9, 0.6)',
      }),
      stroke: new Stroke({
        color: '#F3B415',
        width: 1.5,
      }),
      radius: 10,
      
    }),
  })
};



export const noms_rues = {
  'showLabel' : (feature) => {
      return new Style({
        text: new Text({
            text: feature.get('noms'),
            font: 'bold 14px sans-serif letter-spacing: 0.2rem',
            
            fill: new Fill({ color: 'rgba(230, 72, 9, 0.6)' }),
            stroke: new Stroke({ color: 'rgba(230, 72, 9, 0.6)', width: 1 }),
            placement: 'line', // s'applique bien aux LineString
              }),
        
      })
      console.log("Test : ", feature.get('noms'))

    }
}

export const parcelles_region = {
  'intersects': new Style({
    stroke: new Stroke({
      color: 'red',
      width:2
    })
  })
}



export const styles_vecteurs = {
  'sitesFouilles': sites_fouilles,
  'nomsRues': noms_rues,
  'parcellesRegion': parcelles_region
}