import 'maplibre-gl/dist/maplibre-gl.css';
import './css/map.css';
import maplibregl from 'maplibre-gl';
import { App } from './js/app.js';

const map = new maplibregl.Map({
    container: 'map',
    style: {
        version: 8,
        glyphs: "https://api.maptiler.com/fonts/{fontstack}/{range}.pbf?key=ZNQWXcznKtXVNVM4MoQE",
        sources: {
            // --- BASEMAP SOURCES ---
            osm: { 
                type: 'raster', 
                tiles: ['https://api.maptiler.com/maps/basic-v2/{z}/{x}/{y}.png?key=ZNQWXcznKtXVNVM4MoQE'], 
                tileSize: 512,
                attribution: 'Carte des découvertes archéologiques dans le quartier des Palais Royaux, Alexandrie © CEAlex - © MapTiler © OpenStreetMap Contributors'
            },
            satellite: { 
                type: 'raster', 
                tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], 
                tileSize: 256, 
                attribution: 'Tiles &copy; Esri' 
            },
            
            // --- TEGOLA SOURCE (POINTS) ---
            tegola_points: { type: 'vector', tiles: ['http://localhost:8080/maps/cartalex/{z}/{x}/{y}.pbf'], minzoom: 0, maxzoom: 22 },

            // --- PG_TILESERV SOURCES ---
            pgts_parcelles_region: { type: 'vector', tiles: ['http://localhost:7800/public.parcelles_region/{z}/{x}/{y}.pbf'], minzoom: 0, maxzoom: 22 },
            pgts_espaces_publics: { type: 'vector', tiles: ['http://localhost:7800/public.espaces_publics/{z}/{x}/{y}.pbf'], minzoom: 0, maxzoom: 22 },
            pgts_emprises: { type: 'vector', tiles: ['http://localhost:7800/public.emprises/{z}/{x}/{y}.pbf'], minzoom: 0, maxzoom: 22 },
            pgts_littoral: { type: 'vector', tiles: ['http://localhost:7800/public.littoral/{z}/{x}/{y}.pbf'], minzoom: 0, maxzoom: 22 },

            // --- HISTORICAL MAP SOURCES ---
            "plan-adriani": { type: "raster", tiles: ["/adriani/{z}/{x}/{y}.png"], tileSize: 256, attribution: "Plan d'Adriani, 1934" },
            "plan-tkaczow": { type: "raster", tiles: ["/tkaczow/{z}/{x}/{y}.png"], tileSize: 256, attribution: "Plan de Tkaczow, 1993" },
            "plan-falaky":  { type: "raster", tiles: ["/falaky/{z}/{x}/{y}.png"],  tileSize: 256, attribution: "Restitution de Mahmoud Bey el-Falaki, 1866" },
            "plan-de-tkaczow-east": { type: "raster", tiles: ["/tkaczow east/{z}/{x}/{y}.png"], tileSize: 256, attribution: "Plan de Tkaczow east" },
            "plan-de-tkaczow-west": { type: "raster", tiles: ["/tkaczow west/{z}/{x}/{y}.png"], tileSize: 256, attribution: "Plan de Tkaczow west" },
        },
        layers: [
            // --- START: LAYER ORDER TO MATCH SCREENSHOT ---

            // --- 1. Base Maps ---
            { id: 'osm-background', type: 'raster', source: 'osm', layout: { 'visibility': 'visible' } },
            { id: 'satellite-background', type: 'raster', source: 'satellite', layout: { 'visibility': 'none' } },

            // --- 2. Historical Plans ---
            { id: "Plan d'Adriani, 1934", type: "raster", source: "plan-adriani", layout: { "visibility": "none" } },
            { id: "Plan de Tkaczow, 1993", type: "raster", source: "plan-tkaczow", layout: { "visibility": "none" } },
            { id: "Restitution de Mahmoud bey el-Falaki, 1866",  type: "raster", source: "plan-falaky",  layout: { "visibility": "none" } },
            { id: "Plan de Tkaczow east", type: "raster", source: "plan-de-tkaczow-east", layout: { "visibility": "none" } },
            { id: "Plan de Tkaczow west", type: "raster", source: "plan-de-tkaczow-west", layout: { "visibility": "none" } },

            // --- 3. Vector Data Layers ---
            // Emprises
            { 
                id: 'emprises-fill',         
                type: 'fill', 
                source: 'pgts_emprises',         
                'source-layer': 'public.emprises',         
                layout: { 'visibility': 'none' }, 
                paint: { 'fill-color': 'rgba(255, 255, 255, 0.6)' } 
            },
            {
                id: 'emprises-line',
                type: 'line',
                source: 'pgts_emprises',
                'source-layer': 'public.emprises',
                layout: { 'visibility': 'none' },
                paint: { 'line-color': '#910FCD', 'line-width': 2.5 },
                metadata: { 'filter-ui': 'ignore' }
            },
            // Espaces Publics
            { 
                id: 'espaces_publics-fill',  
                type: 'fill', 
                source: 'pgts_espaces_publics',  
                'source-layer': 'public.espaces_publics',  
                layout: { 'visibility': 'none' }, 
                paint: { 'fill-color': 'rgba(255, 255, 255, 0.6)' } 
            },
            {
                id: 'espaces_publics-line',
                type: 'line',
                source: 'pgts_espaces_publics',
                'source-layer': 'public.espaces_publics',
                layout: { 'visibility': 'none' },
                paint: { 'line-color': '#4E98D7', 'line-width': 1 },
                metadata: { 'filter-ui': 'ignore' }
            },
            // Littoral
            { id: 'littoral-line', type: 'line', source: 'pgts_littoral', 'source-layer': 'public.littoral', layout: { 'visibility': 'none' }, paint: { 'line-color': 'rgb(78, 152, 215)', 'line-width': 4 } },
            // Parcelles / Cadastre
            { id: 'parcelles_region-fill', type: 'fill', source: 'pgts_parcelles_region', 'source-layer': 'public.parcelles_region', layout: { 'visibility': 'none' }, paint: { 'fill-color': 'rgba(255, 255, 255, 0.6)', 'fill-outline-color': '#4E98D7' } },

            // --- 4. Point Data (Drawn last, on top of everything) ---
            // Hover Effects
            {
                id: 'sites_fouilles-waves',
                type: 'circle',
                source: 'tegola_points',
                'source-layer': 'sites_fouilles',
                paint: {
                    'circle-radius': 8,
                    'circle-radius-transition': { duration: 0 },
                    'circle-opacity-transition': { duration: 0 },
                    'circle-color': 'rgb(251, 255, 0)',
                    'circle-stroke-color': 'yellow',
                    'circle-stroke-width': 4
                },
                filter: ['==', ['id'], ''],
                metadata: { 'filter-ui': 'ignore' } // Hide from UI
            },
            {
                id: 'sites_fouilles-pulse',
                type: 'circle',
                source: 'tegola_points',
                'source-layer': 'sites_fouilles',
                paint: {
                    'circle-radius': 6,
                    'circle-color': 'rgb(251, 255, 0)',
                    'circle-stroke-color': 'yellow',
                    'circle-stroke-width': 1.5,
                    'circle-opacity': 1.0
                },
                filter: ['==', ['id'], ''],
                metadata: { 'filter-ui': 'ignore' } // Hide from UI
            },
            // Main Points Layer
            { 
                id: 'sites_fouilles-points', 
                type: 'circle', 
                source: 'tegola_points', 
                'source-layer': 'sites_fouilles', 
                paint: { 
                    'circle-radius': 6, 
                    'circle-color': 'rgb(155, 0, 245)', 
                    'circle-stroke-color': 'white', 
                    'circle-stroke-width': 2 
                } 
            }
            // --- END: LAYER ORDER ---
        ]
    },
    center: [29.9187, 31.2001],
    zoom: 14,
    attributionControl: false
});

map.addControl(new maplibregl.NavigationControl());

// --- Extra Controls ---
map.addControl(new maplibregl.AttributionControl({
    customAttribution: ''
}), 'bottom-right');

map.addControl(new maplibregl.ScaleControl({
    maxWidth: 100,
    unit: 'metric'
}), 'bottom-left');

map.on('load', () => {
    const app = new App(map);
    app.initialize();

    // --- START: Added code to widen filter containers ---
    const empiresContainer = document.getElementById('container-empires');
    const espacesContainer = document.getElementById('container-espaces');

    if (empiresContainer) {
      empiresContainer.style.width = '400px';
    }
    
    if (espacesContainer) {
      espacesContainer.style.width = '400px';
    }
    // --- END: Added code ---

    // --- Coordinates Display ---
    const coordinatesDisplay = document.getElementById('coordinates-display');
    const center = map.getCenter();
    coordinatesDisplay.innerHTML = `Lat/Lon (WGS84): ${center.lat.toFixed(6)}, ${center.lng.toFixed(6)}`;

    map.on('mousemove', (e) => {
        coordinatesDisplay.innerHTML = `Lat/Lon (WGS84): ${e.lngLat.lat.toFixed(6)}, ${e.lngLat.lng.toFixed(6)}`;
    });
});

