import maplibregl from 'maplibre-gl';
import { FilterCollection } from './FilterCollection.js';
import { filters_config } from './filters_config.js';
import { server_config } from './server_config.js';
import { buildFilterUI, buildLayerList, attachAllEventListeners } from './ui.js';
import { DistanceMeasure } from './DistanceMeasure.js';

export class App {
    constructor(map) {
        this.map = map;
        this.filterCollection = null;
        this.popup = null;
        this.historicalMapIds = [
            "Plan d'Adriani, 1934",
            "Plan de Tkaczow, 1993",
            "Restitution de Mahmoud bey el-Falaki, 1866",
            "Plan de Tkaczow east",
            "Plan de Tkaczow west"
        ];
        this.hoveredFid = null;
        this.distanceMeasure = null;
        
        // NEW: Inject the CSS styles for our copy-to-clipboard notification on startup.
        this.injectToastStyles();
    }

    async initialize() {
        console.log('Initializing application...');
        try {
            await this.initFilters();
            this.initLayerList(); // This function is now edited
            this.initEventListeners();
            this.initMapClickListener(); 
            this.initDeepLinkHandlers();
            this.initHoverEffect();
            this.initDistanceMeasure();
            console.log('Application initialized successfully.');
        } catch (error) {
            console.error("Failed to initialize the application:", error);
        }
    }

    async initFilters() {
        const layerName = 'sitesFouilles';
        this.filterCollection = new FilterCollection(layerName, filters_config[layerName], server_config.api_at);
        await this.filterCollection.initFilters();
        buildFilterUI(this.filterCollection.getFilters());
    }

    /**
     * --- EDITED FUNCTION ---
     * This function now sorts the layers into your custom order
     * BEFORE passing them to the UI builder.
     */
    initLayerList() {
        // 1. Get all layers from the map style (in their drawing order)
        const allLayers = this.map.getStyle().layers;

        // 2. Filter out layers we want to hide (like ...-line and hover effects)
        const layersForUI = allLayers.filter(layer => {
            return !(layer.metadata && layer.metadata['filter-ui'] === 'ignore');
        });

        // 3. Define YOUR exact desired order using the layer IDs
        const desiredOrder = [
            'sites_fouilles-points',         // 1. Découvertes archéologiques...
            'emprises-fill',                   // 2. Emprises des sites...
            'espaces_publics-fill',            // 3. Espaces publics...
            'littoral-line',                   // 4. Littoral
            'parcelles_region-fill',         // 5. Cadastre Alexandrin...
            'Plan de Tkaczow west',            // 6. Plan de Tkaczow west
            'Plan de Tkaczow east',            // 7. Plan de Tkaczow east
            'Plan de Tkaczow, 1993',         // 8. Plan de Tkaczow, 1993
            "Plan d'Adriani, 1934",          // 9. Plan d'Adriani, 1934
            'Restitution de Mahmoud bey el-Falaki, 1866', // 10. Restitution de Mahmoud...
            'satellite-background',            // 11. Google Earth
            'osm-background'                   // 12. OpenStreetMap
        ];

        // 4. Sort the 'layersForUI' array based on your 'desiredOrder'
        const sortedLayersForUI = layersForUI.sort((a, b) => {
            const indexA = desiredOrder.indexOf(a.id);
            const indexB = desiredOrder.indexOf(b.id);
            
            // Handle any layers not in the list (just in case)
            const effectiveIndexA = (indexA === -1) ? Infinity : indexA;
            const effectiveIndexB = (indexB === -1) ? Infinity : indexB;

            return effectiveIndexA - effectiveIndexB;
        });

        // 5. Pass the newly sorted array to the UI builder
        buildLayerList(sortedLayersForUI, this.map, this.historicalMapIds);
    }

    initEventListeners() {
        attachAllEventListeners(
            this.filterCollection.getFilters(),
            async () => { await this.updateMapFilter(); },
            (layerId, isVisible) => { this.toggleLayerVisibility(layerId, isVisible); },
            (layerId, opacity) => { this.setLayerOpacity(layerId, opacity); }
        );
    }

    /**
     * UPDATED CLICK LISTENER
     */
    initMapClickListener() {
        // Listen for all clicks on the map canvas.
        this.map.on('click', (e) => {
            // If distance measure is active, let it handle the click
            if (this.distanceMeasure && this.distanceMeasure.isMeasurementActive()) {
                return; // DistanceMeasure will handle this click
            }

            // Check if the click happened on one of our site features.
            const siteFeatures = this.map.queryRenderedFeatures(e.point, {
                layers: ['sites_fouilles-points']
            });

            // If a site feature was clicked, run your original logic.
            if (siteFeatures.length > 0) {
                if (this.popup) { this.popup.remove(); }
                const feature = siteFeatures[0];
                const coordinates = feature.geometry.coordinates.slice();
                const fid = feature.id; // Using `feature.id` as in your original code

                // Copy the coordinates of the clicked feature as well
                const lngStr = Number(coordinates[0]).toFixed(6);
                const latStr = Number(coordinates[1]).toFixed(6);
                const coordsStr = `${latStr}, ${lngStr}`;
                this.copyToClipboard(coordsStr);
                this.showCopyConfirmation(coordsStr);

                // Smooth Google-Earth-like fly-to
                this.flyToCoordinates(coordinates, { zoom: 18, duration: 2000 });

                // After movement ends, open popup
                const onMoveEnd = () => {
                    this.map.off('moveend', onMoveEnd);
                    this.showPopupForSite(fid, coordinates);
                };
                this.map.on('moveend', onMoveEnd);

                // Sync URL
                this.updateUrlForPoint(fid);
            } else {
                // If the click was on an empty part of the map, copy the coordinates.
                const lng = e.lngLat.lng.toFixed(6);
                const lat = e.lngLat.lat.toFixed(6);
                const coords = `${lat}, ${lng}`;
                this.copyToClipboard(coords);
                this.showCopyConfirmation(coords);
            }
        });

        // Your original hover effects remain unchanged.
        this.map.on('mouseenter', 'sites_fouilles-points', () => { this.map.getCanvas().style.cursor = 'pointer'; });
        this.map.on('mouseleave', 'sites_fouilles-points', () => { this.map.getCanvas().style.cursor = ''; });
    }

    // --- All your other functions are preserved below ---

    initDeepLinkHandlers() {
        const params = new URLSearchParams(window.location.search);
        const pointParam = params.get('point');
        if (pointParam) {
            const fid = Number(pointParam);
            if (!Number.isNaN(fid)) {
                this.focusPointByFid(fid);
            }
        }
        window.addEventListener('popstate', () => {
            const sp = new URLSearchParams(window.location.search);
            const p = sp.get('point');
            if (p) {
                const fidPop = Number(p);
                if (!Number.isNaN(fidPop)) {
                    this.focusPointByFid(fidPop);
                }
            } else {
                if (this.popup) { this.popup.remove(); this.popup = null; }
            }
        });
    }

    updateUrlForPoint(fid) {
        const url = new URL(window.location.href);
        url.searchParams.set('point', String(fid));
        window.history.pushState({}, '', url);
    }

    flyToCoordinates(coordinates, { zoom = 18, duration = 2000 } = {}) {
        this.map.flyTo({
            center: coordinates,
            zoom,
            duration,
            curve: 1.6,
            easing: (t) => 1 - Math.pow(1 - t, 2)
        });
    }

    async focusPointByFid(fid) {
        try {
            const coords = await this.getCoordinatesForFid(fid);
            if (!coords) { return; }
            this.flyToCoordinates(coords, { zoom: 18, duration: 2000 });
            const onMoveEnd = () => {
                this.map.off('moveend', onMoveEnd);
                this.showPopupForSite(fid, coords);
            };
            this.map.on('moveend', onMoveEnd);
        } catch (e) {
            console.error('Failed to focus point by fid', fid, e);
        }
    }

    async getCoordinatesForFid(fid) {
        const tryFind = () => {
            const features = this.map.querySourceFeatures('tegola_points', { sourceLayer: 'sites_fouilles' }) || [];
            for (const f of features) {
                if (Number(f.id) === Number(fid)) {
                    const c = f.geometry.coordinates;
                    return Array.isArray(c) ? c.slice() : null;
                }
            }
            return null;
        };
        let found = tryFind();
        if (found) { return found; }
        const maxAttempts = 5;
        for (let i = 0; i < maxAttempts; i++) {
            await new Promise(resolve => {
                const handler = () => { this.map.off('idle', handler); resolve(); };
                this.map.on('idle', handler);
            });
            found = tryFind();
            if (found) { return found; }
        }
        return null;
    }
    
    initHoverEffect() {
        this.map.on('mousemove', 'sites_fouilles-points', (e) => {
            if (e.features.length > 0) {
                if (this.hoveredFid !== e.features[0].id) {
                    if (this.hoveredFid !== null) {
                        this.map.setFeatureState(
                            { source: 'tegola_points', sourceLayer: 'sites_fouilles', id: this.hoveredFid },
                            { hover: false }
                        );
                    }
                    this.hoveredFid = e.features[0].id;
                    this.map.setFeatureState(
                        { source: 'tegola_points', sourceLayer: 'sites_fouilles', id: this.hoveredFid },
                        { hover: true }
                    );
                }
            }
        });
        this.map.on('mouseleave', 'sites_fouilles-points', () => {
            if (this.hoveredFid !== null) {
                this.map.setFeatureState(
                    { source: 'tegola_points', sourceLayer: 'sites_fouilles', id: this.hoveredFid },
                    { hover: false }
                );
            }
            this.hoveredFid = null;
        });
        this.animateHoverEffect();
    }
    
    animateHoverEffect() {
        const radius = 6;
        const maxRadius = 15;
        let frame = 0;
        const animate = (timestamp) => {
            if (this.hoveredFid !== null) {
                const filter = ['==', ['id'], this.hoveredFid];
                this.map.setFilter('sites_fouilles-pulse', filter);
                this.map.setFilter('sites_fouilles-waves', filter);
                const pulseRadius = radius + Math.sin(timestamp / 300) * 1.5;
                this.map.setPaintProperty('sites_fouilles-pulse', 'circle-radius', pulseRadius);
                const waveRadius = (frame % maxRadius) + radius;
                const waveOpacity = 1 - (waveRadius / (maxRadius + radius));
                this.map.setPaintProperty('sites_fouilles-waves', 'circle-radius', waveRadius);
                this.map.setPaintProperty('sites_fouilles-waves', 'circle-opacity', waveOpacity > 0 ? waveOpacity : 0);
                frame += 0.3;
            } else {
                const nullFilter = ['==', ['id'], ''];
                this.map.setFilter('sites_fouilles-pulse', nullFilter);
                this.map.setFilter('sites_fouilles-waves', nullFilter);
                frame = 0;
            }
            requestAnimationFrame(animate);
        }
        animate(0);
    }

    async showPopupForSite(fid, coordinates) {
        try {
            const response = await fetch(`${server_config.api_at}/sitesFouilles/${fid}/details`);
            if (!response.ok) {
                throw new Error(`API request failed for fid: ${fid}`);
            }
            const data = await response.json();
            const discoverer = data.details.inventeur || '';
            const discoveryDate = data.details.date_decouverte || '';
            const title = `<b>Fouilles ${discoverer} (${discoveryDate})</b><br>Num Tkaczow: ${data.details.num_tkaczow}`;
            let html = `<div class="site-popup"><h4>${title}</h4>`;
            if (data.vestiges && data.vestiges.length > 0) {
                html += `<strong>Vestiges:</strong><ul>`;
                data.vestiges.forEach(v => {
                    const period = v.periode ? v.periode.split(' (')[0] : 'N/A';
                    html += `<li>${v.caracterisation} (${period})</li>`;
                });
                html += `</ul>`;
            }
            if (data.bibliographies && data.bibliographies.length > 0) {
                html += `<strong>Bibliographie sélective:</strong><ul>`;
                data.bibliographies.forEach(b => {
                    const author = b.auteur || '';
                    const docTitle = b.nom_document ? `“${b.nom_document}”` : '';
                    const year = b.annee || '';
                    const page = b.pages || '0';
                    html += `<li>${author}, ${docTitle}, ${year}, ${page}.</li>`;
                });
                html += `</ul>`;
            }
            html += `</div>`;
            this.popup = new maplibregl.Popup().setLngLat(coordinates).setHTML(html).addTo(this.map);
        } catch (error) {
            console.error("Error creating popup:", error);
        }
    }

    // --- NEW HELPER FUNCTIONS FOR COPY-TO-CLIPBOARD ---

    /**
     * Copies the provided text to the user's clipboard.
     * @param {string} text - The text to copy.
     */
    copyToClipboard(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
        } catch (err) {
            console.error('Fallback: Unable to copy', err);
        }
        document.body.removeChild(textArea);
    }

    /**
     * Displays a temporary notification (toast) at the top of the screen.
     * @param {string} message - The message to display.
     */
    showCopyConfirmation(message) {
        const existingToast = document.querySelector('.copy-toast');
        if (existingToast) {
            existingToast.remove();
        }
        const toast = document.createElement('div');
        toast.className = 'copy-toast';
        toast.textContent = `Copied to clipboard: ${message}`;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.top = '40px';
        }, 10);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.top = '20px';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    /**
     * Injects the necessary CSS for the copy notification into the document's head.
     */
    injectToastStyles() {
        const style = document.createElement('style');
        style.innerHTML = `
            .copy-toast {
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background-color: #2D3748;
                color: white;
                padding: 12px 24px;
                border-radius: 8px;
                z-index: 1001;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                font-size: 14px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                opacity: 0;
                transition: opacity 0.3s ease-in-out, top 0.3s ease-in-out;
                pointer-events: none;
            }
        `;
        document.head.appendChild(style);
    }

    // --- End of new functions ---

    /**
     * --- EDITED FUNCTION ---
     * When a fill layer is toggled, this now also toggles the corresponding
     * line layer that we created in index.js.
     */
    toggleLayerVisibility(layerId, isVisible) {
        const visibility = isVisible ? 'visible' : 'none';
        
        // Set visibility for the main layer
        this.map.setLayoutProperty(layerId, 'visibility', visibility);

        // Check if this is one of our special fill layers and toggle the line layer too
        if (layerId === 'espaces_publics-fill') {
            this.map.setLayoutProperty('espaces_publics-line', 'visibility', visibility);
        } else if (layerId === 'emprises-fill') {
            this.map.setLayoutProperty('emprises-line', 'visibility', visibility);
        }
    }

    setLayerOpacity(layerId, opacity) {
        const layer = this.map.getLayer(layerId);
        if (!layer) {
            console.warn(`Attempted to set opacity on a non-existent layer: ${layerId}`);
            return;
        }
        if (layer.type === 'raster') {
            this.map.setPaintProperty(layerId, 'raster-opacity', opacity);
        } else if (layer.type === 'fill') {
            this.map.setPaintProperty(layerId, 'fill-opacity', opacity);
        } else {
            console.warn(`Layer type "${layer.type}" does not support opacity control.`);
        }
    }

    async updateMapFilter() {
        const activeFilters = this.filterCollection.getActiveFilters();
        if (activeFilters.length === 0) {
            this.map.setFilter('sites_fouilles-points', null);
            return;
        }
        const filteredIdsAsString = await this.filterCollection.getFilteredIds();
        const filteredIds = filteredIdsAsString.map(id => Number(id));
        if (filteredIds && filteredIds.length > 0) {
            const filter = ['in', ['id'], ['literal', filteredIds]];
            this.map.setFilter('sites_fouilles-points', filter);
        } else {
            this.map.setFilter('sites_fouilles-points', ['in', ['id'], '']);
        }
    }

    /**
     * Initialize the Distance Measure tool
     */
    initDistanceMeasure() {
        this.distanceMeasure = new DistanceMeasure(this.map);
        console.log('Distance Measure tool initialized');
    }
}