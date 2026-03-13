# PhishGuard AI: System Architecture

The following flowchart illustrates the high-level architecture and data flow of the PhishGuard AI detection system, from data collection in the browser to real-time visualization in the dashboard.

```mermaid
graph TD
    subgraph Browser_Environment ["Browser Environment (User)"]
        A[Target Website] -->|DOM & Content| B(Chrome Extension: content.js)
        B -->|Extraction| C{Data Collector}
        C -->|HTML & Text| D[Linguistic Data]
        C -->|Screenshot| E[Visual Data]
        C -->|URL/Metadata| F[Behavioral Data]
    end

    subgraph Backend_Engine ["FastAPI Backend (PhishGuard AI Engine)"]
        G[API Endpoint: /api/v1/scan]
        D & E & F -->|POST Request| G
        
        G --> H[Analysis Orchestrator]
        
        subgraph Analysis_Layers ["Multi-Layer Analysis"]
            H --> L[Linguistic Analyzer]
            H --> V[Visual Analyzer]
            H --> B2[Behavioral Analyzer]
            
            L -->|Score| R[Risk Aggregator]
            V -->|Score| R
            B2 -->|Score| R
        end
        
        R -->|Calculated Score & Level| S[(SQLite Database)]
        R -->|Real-time Update| W((WebSocket Server))
    end

    subgraph Monitoring_Dashboard ["Vite/React Dashboard"]
        W -->|Broadcast| DS[Dashboard UI]
        DS -->|Stats & History| DH[Real-time Logs]
        DS -->|Configuration| DC[API Settings]
        DC -.->|Update| G
    end

    classDef extension fill:#f9f,stroke:#333,stroke-width:2px;
    classDef backend fill:#bbf,stroke:#333,stroke-width:2px;
    classDef dashboard fill:#bfb,stroke:#333,stroke-width:2px;
    classDef database fill:#fbb,stroke:#333,stroke-width:2px;

    class B,C,D,E,F extension;
    class G,H,L,V,B2,R,W backend;
    class DS,DH,DC dashboard;
    class S database;
```

## Component Breakdown

### 1. Browser Extension (Data Collector)
- **`content.js`**: Injected into the target website to extract DOM elements, forms, scripts, and full-page content.
- **`background.js`**: Handles cross-origin requests and communicates with the backend API.
- **`popup.js`**: Provides a user interface for manual scans and status updates.

### 2. FastAPI Backend (Analysis Engine)
- **API Endpoints**: Handles data ingestion from the extension and serves stats to the dashboard.
- **Linguistic Analyzer**: Uses NLP to detect phishing triggers, urgency, and AI-generated content patterns.
- **Visual Analyzer**: Employs image hashing and computer vision (OpenCV) to detect brand impersonation.
- **Behavioral Analyzer**: Evaluates URL structure, domain age, and heuristic patterns.
- **WebSocket Server**: Provides instant updates to the dashboard for every new scan performed.

### 3. Monitoring Dashboard (Visualization)
- **Real-time Feed**: Displays incoming scans instantly via WebSocket connections.
- **Analytics**: Shows global statistics on detected threats vs. safe sites.
- **Detailed Logs**: Allows for deep-diving into the individual layer scores (Linguistic, Visual, Behavioral) for any scan.

### 4. Persistence Layer
- **SQLite Database**: Stores a permanent log of all scans, scores, and detailed analysis results for historical review.
