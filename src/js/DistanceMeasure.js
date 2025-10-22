import maplibregl from 'maplibre-gl';

/**
 * Distance Measure Tool for Cartalex Map
 * Provides Google Maps-like distance measurement functionality
 */
export class DistanceMeasure {
    constructor(map) {
        this.map = map;
        this.isActive = false;
        this.points = [];
        this.lineSourceId = 'measurement-line';
        this.pointSourceId = 'measurement-points';
        this.currentLineId = null;

        // NEW: Add a single container for both button and panel
        this.container = null; 
        this.panel = null;
        this.button = null;
        this.originalDoubleClickZoom = null;
        
        this.init();
    }

    /**
     * Initialize the distance measure tool
     */
    init() {
        // The order is important: container -> button -> panel
        this.createContainer();
        this.createButton();
        this.createPanel();
        this.setupMapSources();
        this.attachEventListeners();
    }

    /**
     * NEW: Create a single container to hold both the button and the panel.
     * This simplifies positioning immensely.
     */
    createContainer() {
        this.container = document.createElement('div');
        this.container.className = 'cartalex-measure-container';
        document.body.appendChild(this.container);
    }

    /**
     * Create the measure distance button
     */
    createButton() {
        this.button = document.createElement('button');
        this.button.className = 'cartalex-measure-btn';
        this.button.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L13.09 8.26L19 7L17.74 13.09L22 12L15.74 13.09L17 19L10.91 17.74L12 22L10.91 15.74L5 17L6.26 10.91L2 12L8.26 10.91L7 5L13.09 6.26L12 2Z"/>
                <circle cx="12" cy="12" r="2"/>
            </svg>
            <span>Mesure</span>
        `;
        this.button.setAttribute('aria-label', 'Measure Distance');
        this.button.setAttribute('aria-pressed', 'false');
        this.button.title = 'Click to measure distance on the map';
        
        // Append to the container, not the body
        this.container.appendChild(this.button);
    }

    /**
     * Create the measurement panel
     */
    createPanel() {
        this.panel = document.createElement('div');
        this.panel.className = 'cartalex-measure-panel';
        this.panel.innerHTML = `
            <div class="measure-panel-header">
                <h3>Distance Measurement</h3>
                <button class="close-measure-btn" aria-label="Close measurement panel">&times;</button>
            </div>
            <div class="measure-panel-content">
                <div class="measure-summary">
                    <div class="total-distance">
                        <strong>Total Distance: <span id="total-distance">0 m</span></strong>
                    </div>
                    <div class="segment-count">
                        Segments: <span id="segment-count">0</span>
                    </div>
                </div>
                <div class="measure-points" id="measure-points-list">
                    <div class="no-points">Click on the map to add measurement points</div>
                </div>
                <div class="measure-controls">
                    <button id="undo-last-point" class="measure-btn secondary" disabled>Undo Last</button>
                    <button id="clear-measurement" class="measure-btn secondary" disabled>Clear All</button>
                    <button id="export-geojson" class="measure-btn primary" disabled>Export GeoJSON</button>
                </div>
                <div class="measure-instructions">
                    <p><strong>Instructions:</strong></p>
                    <ul>
                        <li>Click on the map to add points</li>
                        <li>Double-click to finish measurement</li>
                        <li>Use buttons below to manage measurement</li>
                    </ul>
                </div>
            </div>
        `;
        
        // REMOVED: All inline style settings. CSS will handle this.
        
        // Append to the container, not the body
        this.container.appendChild(this.panel);
        this.setupPanelEventListeners();
    }

    /**
     * Setup event listeners for the panel
     */
    setupPanelEventListeners() {
        const closeBtn = this.panel.querySelector('.close-measure-btn');
        const undoBtn = this.panel.querySelector('#undo-last-point');
        const clearBtn = this.panel.querySelector('#clear-measurement');
        const exportBtn = this.panel.querySelector('#export-geojson');
        
        closeBtn.addEventListener('click', () => this.close());
        undoBtn.addEventListener('click', () => this.undoLastPoint());
        clearBtn.addEventListener('click', () => this.clearMeasurement());
        exportBtn.addEventListener('click', () => this.exportGeoJSON());
    }

    /**
     * Setup map data sources for measurement visualization
     */
    setupMapSources() {
        // This function remains unchanged
        if (!this.map.getSource(this.lineSourceId)) {
            this.map.addSource(this.lineSourceId, {
                type: 'geojson',
                data: { type: 'FeatureCollection', features: [] }
            });
        }
        if (!this.map.getSource(this.pointSourceId)) {
            this.map.addSource(this.pointSourceId, {
                type: 'geojson',
                data: { type: 'FeatureCollection', features: [] }
            });
        }
        if (!this.map.getLayer('measurement-line-layer')) {
            this.map.addLayer({
                id: 'measurement-line-layer',
                type: 'line',
                source: this.lineSourceId,
                paint: { 'line-color': '#ff4444', 'line-width': 3, 'line-dasharray': [2, 2] }
            });
        }
        if (!this.map.getLayer('measurement-points-layer')) {
            this.map.addLayer({
                id: 'measurement-points-layer',
                type: 'circle',
                source: this.pointSourceId,
                paint: { 'circle-color': '#ff4444', 'circle-radius': 6, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2 }
            });
        }
        if (!this.map.getLayer('measurement-labels-layer')) {
            this.map.addLayer({
                id: 'measurement-labels-layer',
                type: 'symbol',
                source: this.lineSourceId,
                layout: {
                    'text-field': ['get', 'distance'],
                    'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
                    'text-size': 12,
                    'text-offset': [0, -1.5],
                    'text-anchor': 'center'
                },
                paint: { 'text-color': '#ffffff', 'text-halo-color': '#ff4444', 'text-halo-width': 2 }
            });
        }
    }

    /**
     * Attach event listeners to the button and map
     */
    attachEventListeners() {
        this.button.addEventListener('click', () => this.toggle());
        this.button.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.toggle();
            }
        });
    }

    /**
     * REMOVED: setupPanelObserver() and adjustButtonPosition() are no longer needed
     * as CSS handles the positioning robustly now.
     */

    /**
     * Toggle the measurement mode
     */
    toggle() {
        if (this.isActive) {
            this.close();
        } else {
            this.open();
        }
    }

    /**
     * Open measurement mode
     */
    open() {
        this.isActive = true;
        this.container.classList.add('is-open'); // Use a class on the container
        this.button.classList.add('active');
        this.button.setAttribute('aria-pressed', 'true');
        
        this.originalDoubleClickZoom = this.map.doubleClickZoom.isEnabled();
        this.map.doubleClickZoom.disable();
        this.map.getCanvas().style.cursor = 'crosshair';
        
        this.map.on('click', this.handleMapClick);
        this.map.on('dblclick', this.handleMapDoubleClick);
        
        this.updatePanel();
    }

    /**
     * Close measurement mode
     */
    close() {
        this.isActive = false;
        this.container.classList.remove('is-open'); // Use a class on the container
        this.button.classList.remove('active');
        this.button.setAttribute('aria-pressed', 'false');
        
        if (this.originalDoubleClickZoom) {
            this.map.doubleClickZoom.enable();
        }
        
        this.map.getCanvas().style.cursor = '';
        this.map.off('click', this.handleMapClick);
        this.map.off('dblclick', this.handleMapDoubleClick);
        
        this.clearMeasurement();
    }

    /**
     * REMOVED: expandButton() and collapseButton() are no longer needed.
     * Toggling the 'is-open' class on the container is sufficient.
     */

    // --- The rest of the file (from handleMapClick downwards) remains unchanged ---

    handleMapClick = (e) => {
        if (!this.isActive) return;
        const point = {
            lng: e.lngLat.lng,
            lat: e.lngLat.lat,
            id: Date.now() + Math.random()
        };
        this.points.push(point);
        this.updateVisualization();
        this.updatePanel();
    };
    handleMapDoubleClick = (e) => {
        if (!this.isActive) return;
        e.preventDefault();
        this.close();
    };
    updateVisualization() {
        if (this.points.length === 0) {
            this.clearVisualization();
            return;
        }
        const pointFeatures = this.points.map(point => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [point.lng, point.lat] },
            properties: { id: point.id }
        }));
        this.map.getSource(this.pointSourceId).setData({
            type: 'FeatureCollection',
            features: pointFeatures
        });
        if (this.points.length > 1) {
            const lineFeatures = [];
            for (let i = 0; i < this.points.length - 1; i++) {
                const start = this.points[i];
                const end = this.points[i + 1];
                const distance = this.calculateDistance(start, end);
                lineFeatures.push({
                    type: 'Feature',
                    geometry: {
                        type: 'LineString',
                        coordinates: [[start.lng, start.lat], [end.lng, end.lat]]
                    },
                    properties: {
                        distance: this.formatDistance(distance),
                        segmentIndex: i
                    }
                });
            }
            this.map.getSource(this.lineSourceId).setData({
                type: 'FeatureCollection',
                features: lineFeatures
            });
        } else {
            this.map.getSource(this.lineSourceId).setData({
                type: 'FeatureCollection',
                features: []
            });
        }
    }
    clearVisualization() {
        this.map.getSource(this.pointSourceId).setData({ type: 'FeatureCollection', features: [] });
        this.map.getSource(this.lineSourceId).setData({ type: 'FeatureCollection', features: [] });
    }
    updatePanel() {
        const totalDistanceEl = this.panel.querySelector('#total-distance');
        const segmentCountEl = this.panel.querySelector('#segment-count');
        const pointsListEl = this.panel.querySelector('#measure-points-list');
        const undoBtn = this.panel.querySelector('#undo-last-point');
        const clearBtn = this.panel.querySelector('#clear-measurement');
        const exportBtn = this.panel.querySelector('#export-geojson');
        let totalDistance = 0;
        if (this.points.length > 1) {
            for (let i = 0; i < this.points.length - 1; i++) {
                totalDistance += this.calculateDistance(this.points[i], this.points[i + 1]);
            }
        }
        totalDistanceEl.textContent = this.formatDistance(totalDistance);
        segmentCountEl.textContent = Math.max(0, this.points.length - 1);
        if (this.points.length === 0) {
            pointsListEl.innerHTML = '<div class="no-points">Click on the map to add measurement points</div>';
        } else {
            let pointsHtml = '<div class="points-header"><strong>Measurement Points:</strong></div>';
            this.points.forEach((point, index) => {
                const coords = `${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}`;
                pointsHtml += `
                    <div class="point-item">
                        <span class="point-number">${index + 1}</span>
                        <span class="point-coords">${coords}</span>
                    </div>
                `;
            });
            pointsListEl.innerHTML = pointsHtml;
        }
        undoBtn.disabled = this.points.length === 0;
        clearBtn.disabled = this.points.length === 0;
        exportBtn.disabled = this.points.length < 2;
    }
    undoLastPoint() {
        if (this.points.length > 0) {
            this.points.pop();
            this.updateVisualization();
            this.updatePanel();
        }
    }
    clearMeasurement() {
        this.points = [];
        this.clearVisualization();
        this.updatePanel();
    }
    exportGeoJSON() {
        if (this.points.length < 2) return;
        const features = [];
        this.points.forEach((point, index) => {
            features.push({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [point.lng, point.lat] },
                properties: { id: point.id, pointNumber: index + 1 }
            });
        });
        const coordinates = this.points.map(p => [p.lng, p.lat]);
        features.push({
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: coordinates },
            properties: {
                totalDistance: this.calculateTotalDistance(),
                segmentCount: this.points.length - 1,
                measurementType: 'distance'
            }
        });
        const geoJSON = {
            type: 'FeatureCollection',
            features: features,
            properties: {
                exportedAt: new Date().toISOString(),
                tool: 'Cartalex Distance Measure'
            }
        };
        const blob = new Blob([JSON.stringify(geoJSON, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cartalex-measurement-${new Date().toISOString().split('T')[0]}.geojson`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    calculateDistance(point1, point2) {
        const R = 6371000;
        const φ1 = point1.lat * Math.PI / 180;
        const φ2 = point2.lat * Math.PI / 180;
        const Δφ = (point2.lat - point1.lat) * Math.PI / 180;
        const Δλ = (point2.lng - point1.lng) * Math.PI / 180;
        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
    calculateTotalDistance() {
        let total = 0;
        for (let i = 0; i < this.points.length - 1; i++) {
            total += this.calculateDistance(this.points[i], this.points[i + 1]);
        }
        return total;
    }
    getMidpoint(point1, point2) {
        return { lat: (point1.lat + point2.lat) / 2, lng: (point1.lng + point2.lng) / 2 };
    }
    formatDistance(distance) {
        if (distance < 1000) {
            return `${Math.round(distance)} m`;
        } else {
            return `${(distance / 1000).toFixed(2)} km`;
        }
    }
    getPoints() { return [...this.points]; }
    getTotalDistance() { return this.calculateTotalDistance(); }
    isMeasurementActive() { return this.isActive; }
    destroy() {
        if (this.isActive) { this.close(); }
        if (this.container && this.container.parentNode) { this.container.parentNode.removeChild(this.container); }
        if (this.map.getLayer('measurement-labels-layer')) { this.map.removeLayer('measurement-labels-layer'); }
        if (this.map.getLayer('measurement-points-layer')) { this.map.removeLayer('measurement-points-layer'); }
        if (this.map.getLayer('measurement-line-layer')) { this.map.removeLayer('measurement-line-layer'); }
        if (this.map.getSource(this.lineSourceId)) { this.map.removeSource(this.lineSourceId); }
        if (this.map.getSource(this.pointSourceId)) { this.map.removeSource(this.pointSourceId); }
    }
}