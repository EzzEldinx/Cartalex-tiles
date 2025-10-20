# Cartalex - Archaeological Mapping Platform  (Final-Improved Version)


## Project Overview

Cartalex is a comprehensive web-based archaeological mapping platform developed for the **Centre d'Études Alexandrines (CEALEX)**. The platform provides an interactive digital cartography system for managing and visualizing archaeological excavation sites, historical maps, and related bibliographic data from Alexandria and its surrounding regions.

The system serves as a digital cartographic library containing over 2,000 maps and plans dating from the 16th to the 21st century, including perspective views, marine charts, topographical plans, cadastral maps, geological maps, tourist maps, insurance plans, orthophotoplans, and satellite imagery.

## Features

- **Interactive Web Map**: Real-time visualization of archaeological excavation sites using MapLibre GL
- **Historical Map Overlay**: Integration of historical maps including Adriani (1934), Tkaczow (1993), and Mahmoud bey el-Falaki (1866) plans
- **Advanced Filtering System**: Dynamic filtering by archaeological periods, site characteristics, and discovery dates
- **Site Details & Popups**: Comprehensive information display including excavation details, archaeological vestiges, and bibliographic references
- **RESTful API**: Complete backend API for data access and management
- **Database Integration**: PostgreSQL/PostGIS spatial database for geospatial data storage
- **Tile Services**: Multiple tile serving solutions (Tegola, pg_tileserv) for optimized map rendering
- **Responsive Design**: Mobile-friendly interface with adaptive layouts
- **API Documentation**: Swagger/OpenAPI documentation for developer integration

### Fly‑to animation and deep‑linking (Google‑Earth style)

- **Click to fly and open**: Clicking any site point smoothly flies the map to that point (zoom≈18) and opens its popup.
- **Shareable deep link**: The URL updates to include `?point=FID` on click. Opening that link flies to the same point and opens its popup automatically.
- **Back/forward supported**: Browser navigation restores or clears the focused point/popup.

How to use
- Click a point to zoom to it and open its popup.
- Copy the URL (now containing `?point=123`) and share it.
- Opening the link will restore the same focused point and popup.

Implementation overview
- The app listens for clicks on `sites_fouilles-points`, animates with `map.flyTo`, then opens the popup when the move ends. The URL is synchronized via the History API.
- On load (and on `popstate`), the app reads `?point` and performs the same animation and popup logic.


## Project Structure

```
CARTALEX_FINAAAALLLLLLLLL 10-2/
├── src/                          # Source code directory  
│   ├── server/                   # Backend server implementation
│   │   ├── server.js            # Main Express server configuration
│   │   ├── routes.js            # API route definitions
│   │   ├── middleware.js        # Custom middleware and error handlers
│   │   └── db.js               # Database connection and queries
│   ├── js/                      # Frontend JavaScript modules
│   │   ├── app.js              # Main application controller
│   │   ├── FilterCollection.js # Filter management system
│   │   ├── LayerCollection.js  # Map layer management
│   │   ├── ui.js               # User interface components
│   │   └── server_config.js    # API configuration
│   ├── html/                    # HTML templates
│   │   ├── index.html          # Main landing page
│   │   └── map.html            # Interactive map page
│   ├── css/                     # Stylesheets
│   │   ├── map.css             # Map-specific styles
│   │   ├── mystyle.css         # Main application styles
│   │   └── hover_effects.css   # Interactive element styles
│   └── img/                     # Static images and assets
├── public/                      # Public assets (32,000+ map images)
├── tegola/                      # Tegola tile server configuration
│   └── tegola.toml             # Tile server settings
├── postgres/                    # PostgreSQL database files
├── geopackage/                  # GeoPackage data files
├── docker-compose.yml          # Multi-service Docker orchestration
├── Dockerfile                  # Application container definition
├── Dockerfile.raster           # Raster tile service container
├── config.py                   # Terracotta raster server configuration
├── master_correction.sql       # ⚠️ CRITICAL: Database correction scripts for archaeological site FID mapping
├── swagger.yaml                # API documentation specification
├── package.json                # Node.js dependencies and scripts
├── webpack.config.js           # Frontend build configuration
└── webpack.server.config.js    # Server build configuration
```

### Key Files Explanation

- **`docker-compose.yml`**: Orchestrates four services: PostgreSQL database, Tegola tile server, pg_tileserv, and the main application
- **`src/server/server.js`**: Express.js server with CORS, compression, and static file serving
- **`src/js/app.js`**: Main frontend application managing map interactions and filters
- **`tegola/tegola.toml`**: Configuration for vector tile generation from PostGIS data
- **`master_correction.sql`**: ⚠️ **CRITICAL FILE** - Database correction scripts that maintain the essential FID (Feature ID) mapping between archaeological excavation sites and their bibliographic references. This file ensures data integrity for site identification and must be handled with extreme care during any database operations.
- **`config.py`**: Terracotta configuration for raster tile serving

## Technologies Used

### Backend
- **Node.js 18**: Runtime environment
- **Express.js**: Web application framework
- **PostgreSQL 13**: Primary database with PostGIS spatial extensions
- **pg & pg-promise**: PostgreSQL database drivers
- **CORS**: Cross-origin resource sharing
- **Morgan**: HTTP request logging
- **Compression**: Response compression middleware

### Frontend
- **MapLibre GL JS**: WebGL-based mapping library
- **Webpack**: Module bundler and build tool
- **Babel**: JavaScript transpiler
- **CSS3**: Modern styling with responsive design

### Mapping & Tiles
- **Tegola v0.21.2**: Vector tile server
- **pg_tileserv**: PostGIS-native tile server 
- **PostGIS**: Spatial database extensions


### Development & Deployment
- **Docker & Docker Compose**: Containerization and orchestration
- **Swagger/OpenAPI**: API documentation
- **EJS**: Template engine
- **Nodemon**: Development server with hot reloading

## Installation & Setup

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)
- Git

### Quick Start with Docker

1. **Clone the repository**
   ```bash
   git clone <https://github.com/EzzEldinx/Cartalex-tiles>
   cd CARTALEX_FINAAAALLLLLLLLL\ 10-2
   ```

2. **Start all services**
   ```bash
   docker-compose up -d
   ```

3. **Wait for services to initialize**
   ```bash
   # Check service status
   docker-compose ps
   
   # View logs
   docker-compose logs -f app
   ```

4. **Access the application**
   - Main application: http://localhost:3000
   - Interactive map: http://localhost:3000/carte
   - API documentation: http://localhost:3000/api-docs
   - Vector tiles: http://localhost:8080
   - Raster tiles: http://localhost:7800

### Local Development Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start the database**
   ```bash
   docker-compose up -d db
   ```

3. **Initialize the database**
   ```bash
   # Run database initialization scripts
   docker exec -i cartalex_db psql -U postgres -d cartalex_basileia_3857 < master_correction.sql
   ```

4. **Build and run the application**
   ```bash
   npm run build
   npm start
   ```

### Environment Configuration

Create a `.env` file in the project root:
```env
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=postgres
DB_PORT=5432
DB_NAME=cartalex_basileia_3857
CORS_ORIGIN=http://localhost:3000
PORT=3000
```

## How to Run

### Development Mode
```bash
# Start all services
docker-compose up -d

# For development with hot reloading
npm run build
npm start

# Monitor logs
docker-compose logs -f
```

### Production Mode
```bash
# Build optimized containers
docker-compose -f docker-compose.prod.yml up -d

# Or build manually
npm run build
NODE_ENV=production npm start
```

### Individual Services
```bash
# Database only
docker-compose up -d db

# Tile servers only
docker-compose up -d tegola pgtileserv

# Application only (requires database)
docker-compose up -d app
```

## How to Add/Contribute

### Adding New Features

1. **Frontend Development**
   ```bash
   # Add new JavaScript modules in src/js/
   # Update webpack configuration if needed
   npm run build
   ```

2. **Backend API Development**
   ```bash
   # Add routes in src/server/routes.js
   # Update swagger.yaml for API documentation
   # Add database queries in src/server/db.js
   ```

3. **Database Schema Changes**
   ```bash
   # Create migration scripts
   # Update master_correction.sql
   # Test with Docker database
   ```

### Code Contribution Guidelines

1. **Fork the repository** and create a feature branch
2. **Follow the existing code structure** and naming conventions
3. **Update documentation** for any API changes
4. **Test thoroughly** with the Docker environment
5. **Submit a pull request** with a clear description

### Adding New Map Layers

1. **Update Tegola configuration** (`tegola/tegola.toml`)
2. **Add layer definitions** in frontend (`src/js/LayerCollection.js`)
3. **Configure filters** if needed (`src/js/filters_config.js`)
4. **Update API endpoints** for layer data

## Testing

### Manual Testing
```bash
# Test API endpoints
curl http://localhost:3000/health
curl http://localhost:3000/getValues/vestiges?field=periode

# Test tile services
curl http://localhost:8080/maps/cartalex/1/0/0.pbf
curl http://localhost:7800/index.html
```

### Database Testing
```bash
# Connect to database
docker exec -it cartalex_db psql -U postgres -d cartalex_basileia_3857

***HOW TO RUN THE SCRIPT***  
docker exec -i cartalex_db psql -U postgres -d cartalex_basileia_3857 < master_correction.sql


# Run test queries
SELECT COUNT(*) FROM sites_fouilles;
SELECT * FROM bibliographies LIMIT 5;

# ⚠️ CRITICAL: Verify FID mapping integrity
SELECT sf.fid, sf.num_tkaczow, COUNT(rb.id_biblio) as ref_count 
FROM sites_fouilles sf 
LEFT JOIN decouvertes d ON sf.id = d.id_site 
LEFT JOIN references_biblio rb ON d.id = rb.id_decouverte 
GROUP BY sf.fid, sf.num_tkaczow 
ORDER BY sf.fid;
```

### ⚠️ Critical File: master_correction.sql

The `master_correction.sql` file is **extremely sensitive** and contains the core FID (Feature ID) mappings that link archaeological excavation sites to their bibliographic references. This file:

- **Maintains data integrity** between sites and their associated documentation
- **Contains 67+ INSERT statements** that establish critical relationships
- **Must be backed up** before any modifications
- **Requires careful testing** in development before production deployment
- **Should never be modified** without thorough understanding of the archaeological data structure

**⚠️ Warning**: Modifying this file incorrectly can break the entire site-to-bibliography mapping system, potentially causing data loss or incorrect site associations.

### Frontend Testing
```bash
# Test build process
npm run build

# Verify static assets
ls -la dist/
```

## Deployment

### Docker Production Deployment

1. **Configure production environment**
   ```bash
   # Update docker-compose.yml with production settings
   # Set environment variables
   # Configure reverse proxy (nginx)
   ```

2. **Deploy with Docker Compose**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. **Set up SSL/TLS**
   ```bash
   # Configure nginx with Let's Encrypt
   # Update CORS settings for production domain
   ```

### Traditional Server Deployment

1. **Install dependencies**
   ```bash
   npm install --production
   ```

2. **Build the application**
   ```bash
   npm run build
   ```

3. **Set up PostgreSQL with PostGIS**
   ```bash
   # Install PostgreSQL 13+ with PostGIS
   # Import database schema and data
   # Configure connection settings
   ```

4. **Configure reverse proxy**
   ```bash
   # Set up nginx or Apache
   # Configure SSL certificates
   # Set up process management (PM2)
   ```

### Cloud Deployment Options

- **AWS**: Use ECS, RDS with PostGIS, and CloudFront
- **Google Cloud**: Deploy with Cloud Run and Cloud SQL
- **Azure**: Use Container Instances and Azure Database for PostgreSQL
- **DigitalOcean**: Deploy with App Platform and managed databases

## Future Improvements / Roadmap

### Short-term Enhancements
- [ ] **Advanced Search Functionality**: Full-text search across all archaeological data
- [ ] **User Authentication**: Role-based access control for data management
- [ ] **Data Export Features**: Export filtered results to CSV, GeoJSON, or KML
- [ ] **Mobile App**: Native mobile application for field archaeologists
- [ ] **Performance Optimization**: Implement caching and CDN for tile services

### Medium-term Goals
- [ ] **3D Visualization**: Integration with WebGL for 3D archaeological site visualization
- [ ] **Machine Learning**: Automated site classification and pattern recognition
- [ ] **Multi-language Support**: Internationalization for English and Arabic interfaces
- [ ] **Collaborative Features**: Real-time collaboration tools for research teams
- [ ] **Advanced Analytics**: Statistical analysis and reporting dashboard

### Long-term Vision
- [ ] **AI-Powered Insights**: Machine learning algorithms for archaeological pattern analysis
- [ ] **VR/AR Integration**: Virtual and augmented reality for immersive site exploration
- [ ] **Blockchain Documentation**: Immutable record-keeping for archaeological findings
- [ ] **Global Integration**: Connect with other archaeological databases worldwide
- [ ] **Educational Platform**: Interactive learning modules for students and researchers

## License

This project is licensed under the **CE-Alex** - see the [package.json](package.json) file for details.

## Contact & Support

- **Centre d'Études Alexandrines (CEALEX)**: [https://www.cealex.org/](https://www.cealex.org/)
- **Email**: topo@cea.com.eg
- **Repository**: [https://github.com/EzzEldinx/Cartalex-tiles]

## Acknowledgments

- **CEALEX Team**: For providing the archaeological data and domain expertise 
  **Kamal Mohsen - Mustafa Mursi - Ezz ElDin** 

---
*Last updated: 2025-10*