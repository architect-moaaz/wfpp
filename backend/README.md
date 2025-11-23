# Workflow++ Backend API

Backend API for the AI Workflow Designer application.

## Features

- RESTful API for workflow management
- BPMN 2.0 XML conversion
- Workflow import/export
- In-memory storage (ready for database integration)

## Installation

```bash
cd backend
npm install
```

## Configuration

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

### Claude AI Integration (Optional)

To enable real LLM-powered workflow generation with Claude AI:

1. Get your API key from [Anthropic Console](https://console.anthropic.com/)
2. Update `.env`:
```env
ANTHROPIC_API_KEY=sk-ant-your-actual-key-here
```

**Note:** If no API key is configured, the system will automatically fall back to rule-based generation.

## Running the Server

Development mode with auto-reload:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The server will start on `http://localhost:5000`

## API Endpoints

### Health Check
- `GET /health` - Check if the API is running

### Workflow Management

#### Create Workflow
- `POST /api/workflows`
- Body:
```json
{
  "name": "My Workflow",
  "nodes": [],
  "connections": [],
  "metadata": {}
}
```

#### Get All Workflows
- `GET /api/workflows`

#### Get Workflow by ID
- `GET /api/workflows/:id`

#### Update Workflow
- `PUT /api/workflows/:id`
- Body:
```json
{
  "name": "Updated Workflow",
  "nodes": [],
  "connections": []
}
```

#### Delete Workflow
- `DELETE /api/workflows/:id`

### Import/Export

#### Export Workflow
- `POST /api/workflows/:id/export`

#### Import Workflow
- `POST /api/workflows/import`
- Body: Full workflow JSON

### BPMN Conversion

#### Convert to BPMN XML
- `POST /api/workflows/:id/convert-to-bpmn`
- Returns BPMN 2.0 compliant XML

## Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Custom middleware
│   ├── models/          # Data models
│   ├── routes/          # API routes
│   ├── utils/           # Utility functions
│   └── server.js        # Main server file
├── .env.example         # Environment variables template
└── package.json         # Dependencies
```

## Technology Stack

- Node.js
- Express.js
- CORS
- Body Parser
- Morgan (logging)
- UUID

## Future Enhancements

- [ ] Database integration (MongoDB/PostgreSQL)
- [ ] Authentication & Authorization
- [ ] AI workflow generation endpoint
- [ ] Workflow validation
- [ ] Real-time collaboration
- [ ] Workflow execution engine
