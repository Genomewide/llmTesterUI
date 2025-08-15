# LLM Tester UI

A modern React TypeScript application for testing and comparing local LLM models with a focus on **biomedical research**, system prompts, structured outputs, and project organization. **Now with Electron support for handling large files (up to 100MB), local file system storage, and comprehensive biomedical data integration.**

## Features

### Core LLM Testing
- **Model Selection**: Dropdown to select from available local LLM models
- **System Prompt Editor**: Easy-to-use interface for editing system prompts
- **User Input Area**: Large text area for input text processing
- **Structured Output Support**: Toggle for JSON, XML, YAML, and CSV outputs
- **Real-time Streaming**: Watch LLM responses generate in real-time with streaming text display
- **Project Management**: Organize tests into projects with history tracking
- **Response Comparison**: Side-by-side comparison of different model responses
- **History Tracking**: Complete history of all interactions with metadata
- **Modern UI**: Built with Material-UI for a professional look and feel

### Biomedical Research Integration
- **ARS API Integration**: Connect to the Automated Reasoning System (Translator network) for biomedical knowledge graphs
- **PubMed Abstract Fetching**: Automatically retrieve publication abstracts and metadata from PubMed
- **Smart Abstract Selection**: Choose between "All Abstracts" or "Top 3 Most Recent" per edge
- **Biomedical Data Processing**: Transform complex knowledge graph data into LLM-friendly formats
- **Subject Node Selection**: Interactive selection of biomedical entities for targeted analysis
- **Publication Metadata**: Include journal, title, publication date, and full abstracts in summaries

### File Processing & Storage
- **Large File Processing**: Upload and process large JSON, CSV, YAML, and XML files (up to 100MB)
- **Data Subset Creation**: Create filtered subsets of uploaded data for targeted analysis
- **Local File Storage**: Store projects and data on your local file system (Electron mode)
- **Cross-Platform**: Available as both web application and desktop application

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Local LLM service (Ollama, etc.) running on your machine
- **For Biomedical Features**: Access to ARS API (Translator network) and PubMed API

## Installation

### Quick Setup (Recommended)

1. Navigate to the project directory:
```bash
cd llmTesterUI
```

2. Run the automated setup script:
```bash
chmod +x setup.sh
./setup.sh
```

The setup script will:
- Check Node.js version requirements
- Install all dependencies (including Electron)
- Create a `.env` file with default configuration
- Create data directories for file storage
- Provide next steps for running the application

### Manual Setup

1. Navigate to the project directory:
```bash
cd llmTesterUI
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file (optional):
```bash
# LLM Tester UI Configuration
REACT_APP_API_URL=http://localhost:3001
REACT_APP_OLLAMA_URL=http://localhost:11434
```

4. Create data directories:
```bash
mkdir -p data/projects data/uploads data/exports
```

5. Start the application:
   - **Web version**: `npm start`
   - **Electron version**: `npm run electron-dev`

## Usage

### Getting Started

1. **Create a Project**: Click "New Project" in the left sidebar to create your first project
2. **Select a Model**: Choose from the available models in the dropdown
3. **Configure Your Test**:
   - Edit the system prompt to define the AI's behavior
   - Enter your input text in the user input area
   - Optionally enable structured output if the model supports it
4. **Run the Test**: Click "Run Test" to execute the model
5. **Review Results**: View the response in the main area and compare with previous tests

### Biomedical Research Workflow

#### 1. Fetch Biomedical Data
1. **Access ARS Data**: Use the Data Fetcher to retrieve biomedical knowledge graphs from the Translator network
2. **Enter Parameters**: Provide your primary key (PK) and select the environment (dev, test, or prod)
3. **Process Knowledge Graph**: The system automatically processes complex nested JSON data into a flattened, structured format

#### 2. Select Subject and Configure Abstracts
1. **Choose Subject Node**: Select a biomedical entity (gene, disease, drug, etc.) from the processed data
2. **Configure Abstract Options**:
   - **No Abstracts**: Basic summary without publication details
   - **All Abstracts**: Include all supporting publications
   - **Top 3 Most Recent**: Include only the 3 most recent publications per edge
3. **Automatic PubMed Integration**: The system automatically fetches abstracts and metadata from PubMed

#### 3. Generate LLM Summaries
1. **Formatted Input**: The system creates a structured input combining:
   - Biomedical relationships and evidence
   - Selected subject node information
   - Publication abstracts (if enabled)
2. **Real-time Streaming**: Watch the LLM generate responses in real-time
3. **Comprehensive Summaries**: Get detailed biomedical insights with supporting evidence

### Large File Processing (Electron Only)

1. **Upload Files**: Use the File Processor to upload large JSON, CSV, YAML, or XML files
2. **Preview Data**: View a preview of the uploaded data before processing
3. **Create Subsets**: Apply filters to create targeted data subsets for analysis
4. **Process with LLMs**: Use the filtered data as input for your LLM tests

### Project Management

- **Create Projects**: Organize related tests into projects
- **Switch Between Projects**: Click on any project in the sidebar to switch
- **Edit Projects**: Click the edit icon to modify project details
- **Delete Projects**: Remove projects you no longer need
- **Export Projects**: Export project data in various formats

### History and Comparison

- **View History**: All interactions are saved in the project history
- **Compare Responses**: Select two interactions and click "Compare Selected"
- **Delete Interactions**: Remove individual test results from history
- **Metadata Tracking**: Response times, model details, and configuration are preserved

### Structured Output

For models that support structured output:
- Enable the "Request Structured Output" toggle
- Select your preferred format (JSON, XML, YAML, CSV)
- Responses will be formatted and syntax-highlighted

## Biomedical Data Integration

### ARS (Automated Reasoning System) API

The application integrates with the Translator network's ARS API to retrieve biomedical knowledge graphs:

- **Knowledge Graph Data**: Complex nested JSON structures containing biomedical relationships
- **Entity Types**: Genes, diseases, drugs, phenotypes, and more
- **Relationship Types**: Various biomedical predicates and edge types
- **Publication Support**: Each relationship includes supporting PubMed publications

### PubMed Integration

#### Automatic Abstract Fetching
- **On-Demand Fetching**: Abstracts are fetched only when a subject is selected and abstracts are enabled
- **Rate Limiting**: Built-in rate limiting (3 requests/second) to comply with PubMed API limits
- **Batching**: Efficient batching of PubMed IDs (10 per request) to minimize API calls
- **Error Handling**: Graceful handling of API failures and rate limit exceeded errors

#### Abstract Selection Strategies
- **All Abstracts**: Fetches and includes all supporting publications
- **Top 3 Most Recent**: 
  - Fetches metadata for ALL publications per edge
  - Sorts by publication date (newest first)
  - Selects the 3 most recent publications per edge
  - Fetches full abstracts only for the selected publications

#### Publication Metadata
Each abstract includes:
- **Title**: Full publication title
- **Journal**: Journal name
- **Publication Date**: Year of publication
- **Abstract**: Complete abstract text
- **PubMed ID**: Unique identifier for the publication

### Data Processing Pipeline

#### 1. ARS Data Retrieval
```
ARS API → Complex JSON → Flattened Structure → Processed Data
```

#### 2. Subject Selection & Abstract Fetching
```
Processed Data → Subject Selection → PubMed ID Extraction → Abstract Fetching → Enriched Data
```

#### 3. LLM Input Formatting
```
Enriched Data → Structured Input → LLM Processing → Real-time Streaming Response
```

### Example Data Flow

#### Input Data Structure
```
Subject: "MDR1 gene"
Relationships: [
  {
    predicate: "increases_expression_of",
    object: "P-glycoprotein",
    publications: "PMID:123456,PMID:789012,PMID:345678",
    abstracts: [
      {
        title: "MDR1 polymorphisms and drug response",
        journal: "Pharmacogenomics",
        publicationDate: "2023",
        abstract: "Various polymorphisms of the MDR1 gene..."
      }
    ]
  }
]
```

#### LLM Summary Output
```
The MDR1 gene shows several important relationships in the biomedical literature:

1. MDR1 increases_expression_of P-glycoprotein
   - Supporting Publications:
     MDR1 polymorphisms and drug response
     Pharmacogenomics (2023)
     Abstract: Various polymorphisms of the MDR1 gene that encodes for P-glycoprotein (P-gp), a transmembrane pump, have been identified...
```

## Architecture

### Web vs Electron Mode

The application can run in two modes:

#### Web Mode (Browser)
- Uses browser localStorage for data persistence
- Limited to smaller files due to browser constraints
- Accessible via web browser at `http://localhost:3000`
- **Limited PubMed Integration**: Subject to CORS restrictions

#### Electron Mode (Desktop)
- Uses local file system for data storage
- Supports large files up to 100MB
- Native desktop application experience
- Better performance for large data processing
- **Full PubMed Integration**: Bypasses CORS restrictions via main process

### Data Storage

#### Web Mode
- **Storage**: Browser localStorage
- **Limitations**: 5-10MB storage limit, browser memory constraints
- **Location**: Browser's local storage

#### Electron Mode
- **Storage**: Local file system
- **Location**: `~/Library/Application Support/llm-tester-ui/data/` (macOS)
- **Structure**:
  ```
  data/
  ├── projects/          # Project data and interactions
  ├── uploads/           # Uploaded large files
  ├── exports/           # Exported project data
  └── examplefiles/      # Example biomedical data files
  ```

### File Processing

The Electron version includes advanced file processing capabilities:

- **Streaming Processing**: Large files are processed in chunks to avoid memory issues
- **Multiple Formats**: Support for JSON, CSV, YAML, and XML files
- **Data Preview**: Preview uploaded data before processing
- **Subset Creation**: Create filtered subsets of data for targeted analysis
- **Metadata Tracking**: Track file information, processing times, and data statistics

### PubMed API Architecture

#### Rate Limiting Strategy
- **Batch Size**: 10 PubMed IDs per request
- **Delay Between Batches**: 350ms (allows max 3 requests/second)
- **Error Handling**: Automatic retry with exponential backoff
- **Caching**: Built-in caching to avoid redundant requests

#### Electron Integration
- **Main Process**: All PubMed API calls routed through Electron main process
- **CORS Bypass**: Avoids browser CORS restrictions
- **Centralized Control**: Consistent rate limiting and error handling
- **IPC Communication**: Secure communication between renderer and main processes

## Configuration

### Environment Variables

Create a `.env` file in the project root to customize the application:

```bash
# API Configuration
REACT_APP_API_URL=http://localhost:3001
REACT_APP_OLLAMA_URL=http://localhost:11434

# PubMed API Configuration (optional)
PUBMED_API_KEY=your_api_key_here
```

### Application Configuration

Edit `src/config.ts` to customize the application behavior:

```typescript
export const CONFIG = {
  // Set to true to use real Ollama API, false for mock data
  USE_REAL_OLLAMA: false,
  
  // Ollama API endpoint
  OLLAMA_URL: 'http://localhost:11434',
  
  // Default model settings
  DEFAULT_TEMPERATURE: 0.7,
  DEFAULT_MAX_TOKENS: 4096,
  
  // Available MedGemma models
  MEDGEMMA_MODELS: [
    'medgem-custom:latest',
    'medgemma:2b',
    'medgemma:7b',
    'medgemma:latest'
  ],
  
  // Models that support structured output
  STRUCTURED_OUTPUT_MODELS: [
    'llama3.2',
    'llama3.3',
    'qwen3',
    'mistral-large',
    'medgem-custom',
    'medgemma'
  ],
  
  // PubMed API settings
  PUBMED_BATCH_SIZE: 10,
  PUBMED_RATE_LIMIT_DELAY: 350, // milliseconds
};
```

### Adding New Models

To add new models, edit the `MOCK_MODELS` array in `src/services/api.ts`:

```typescript
const MOCK_MODELS: LLMModel[] = [
  {
    id: 'your-model-id',
    name: 'Your Model Name',
    provider: 'Your Provider',
    supportsStructuredOutput: true,
    maxTokens: 4096,
    temperature: 0.7
  }
];
```

### Using MedGemma Models

The UI now includes support for MedGemma models:

1. **Available Models**: The UI includes `medgem-custom:latest` and other MedGemma variants
2. **Medical Responses**: MedGemma models provide specialized medical responses
3. **Structured Output**: MedGemma supports JSON structured output for medical assessments
4. **Real Integration**: Set `USE_REAL_OLLAMA: true` in `src/config.ts` to use real Ollama API

To enable real Ollama integration:
```typescript
// In src/config.ts
export const CONFIG = {
  USE_REAL_OLLAMA: true,  // Change this to true
  OLLAMA_URL: 'http://localhost:11434',
  // ... other config
};
```

### Backend Integration

The application includes both mock data and real API integration:

#### Current Implementation
- **Mock Mode** (default): Uses simulated responses for development
- **Real API Mode**: Integrates with actual Ollama API when enabled

#### Ollama API Integration
The application includes a dedicated Ollama API service (`src/services/ollama-api.ts`) that provides:

```typescript
// Example usage
import { OllamaAPIService } from './services/ollama-api';

const ollamaService = new OllamaAPIService('http://localhost:11434');
const models = await ollamaService.getAvailableModels();
const result = await ollamaService.testModel(config);
```

#### Custom Backend Integration
To integrate with your own LLM service:

1. Update the API calls in `src/services/api.ts`
2. Replace mock responses with actual API calls to your LLM service
3. Configure the proxy in `package.json` to point to your backend

Example backend integration:
```typescript
static async testModel(config: TestConfig): Promise<Interaction> {
  const response = await fetch('/api/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  });
  return await response.json();
}
```

## Project Structure

```
src/
├── components/          # React components
│   ├── ModelSelector.tsx
│   ├── PromptEditor.tsx
│   ├── ResponseViewer.tsx
│   ├── ProjectManager.tsx
│   ├── HistoryViewer.tsx
│   ├── DataFetcher.tsx      # ARS API integration
│   ├── DataViewer.tsx       # Biomedical data visualization
│   ├── SubjectNodeSelector.tsx  # Subject selection with abstract options
│   └── FileProcessor.tsx    # Large file processing
├── services/           # API and data services
│   ├── api.ts
│   ├── ollama-api.ts
│   ├── ars-api.ts          # ARS API service
│   ├── pubmed-api.ts       # PubMed API service
│   ├── data-processor.ts   # Biomedical data processing
│   └── export-service.ts   # Data export functionality
├── types/              # TypeScript type definitions
│   └── index.ts
├── App.tsx             # Main application component
├── index.tsx           # Application entry point
└── index.css           # Global styles

public/
├── electron.js         # Main Electron process (includes PubMed API handlers)
├── preload.js          # Electron preload script
└── index.html          # Application entry point

data/
├── examplefiles/       # Example biomedical data files
├── exports/           # Exported project data
└── projects/          # Project data and interactions
```

## Development

### Available Scripts

- `npm start` - Start development server (web mode)
- `npm run electron-dev` - Start Electron development mode
- `npm run electron` - Start Electron app (production build)
- `npm run build` - Build for production
- `npm run electron-pack` - Package Electron app
- `npm run dist` - Create distributable
- `npm test` - Run tests
- `npm eject` - Eject from Create React App

### Running the Application

#### Web Mode
```bash
npm start
# Open http://localhost:3000 in your browser
```

#### Electron Mode
```bash
npm run electron-dev
# Desktop application will open automatically
```

### Customization

- **Styling**: Modify the theme in `App.tsx` or add custom CSS
- **Components**: Extend or modify components in the `components/` directory
- **API**: Update the API service to integrate with your backend
- **Types**: Add new TypeScript interfaces in `types/index.ts`
- **File Processing**: Extend file processing capabilities in `public/electron.js`
- **Biomedical Data**: Customize data processing in `src/services/data-processor.ts`

## Troubleshooting

### Common Issues

1. **Models not loading**: Check that your LLM service is running and accessible
2. **Tests failing**: Verify your system prompt and input text are valid
3. **Projects not saving**: 
   - Web mode: Check browser localStorage permissions
   - Electron mode: Check file system permissions
4. **Structured output not working**: Ensure the selected model supports structured output
5. **Large files not processing**: Ensure you're running in Electron mode
6. **Electron app not starting**: Check Node.js version and dependencies

### Biomedical Research Issues

7. **ARS API errors**: 
   - Verify your primary key (PK) is valid
   - Check that the selected environment (dev/test/prod) is accessible
   - Ensure network connectivity to the Translator network
8. **PubMed API rate limiting**:
   - The system automatically handles rate limiting (3 requests/second)
   - If you see "429 Too Many Requests" errors, the system will retry automatically
   - Consider using "Top 3 Most Recent" instead of "All Abstracts" for large datasets
9. **Abstract fetching failures**:
   - Check console logs for detailed error messages
   - Verify PubMed IDs are valid
   - Ensure you're running in Electron mode for full PubMed integration

### Browser Compatibility

- Chrome (recommended)
- Firefox
- Safari
- Edge

### Electron Requirements

- macOS 10.11+ (for macOS builds)
- Windows 7+ (for Windows builds)
- Linux (for Linux builds)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is open source and available under the MIT License.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the code comments
3. Open an issue on GitHub

---

**Note**: The Electron version provides enhanced capabilities for large file processing, local data storage, and full biomedical research integration. For production use with large datasets and PubMed integration, the Electron version is recommended. 