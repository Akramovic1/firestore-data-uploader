# Firestore Data Uploader

A modern, AI-powered web application for managing and uploading structured data to Google Firestore with intelligent schema management and data generation capabilities.

## ✨ Features

### 🚀 **Core Functionality**
- **Batch Upload**: Upload JSONL files to Firestore collections with progress tracking
- **Firebase Integration**: Secure service account authentication
- **Real-time Monitoring**: Live progress updates and detailed logging

### 🤖 **AI-Powered Schema Management**
- **Custom Schema Creation**: Build schemas manually or upload JSON files
- **AI Field Generation**: Generate relevant fields using natural language descriptions
- **Smart Enhancement**: Auto-detect missing fields from example data
- **Schema Validation**: Comprehensive validation with helpful error messages

### 💾 **Local Storage & Management**
- **Persistent Storage**: Custom schemas saved locally across sessions
- **Import/Export**: Share schemas or create backups
- **Schema Manager**: Comprehensive interface for organizing schemas
- **Version Control**: Track schema changes and modifications

### 📊 **Data Generation**
- **AI Data Generation**: Create realistic test data with OpenAI/Claude integration
- **Template-Based**: Generate data following predefined schema patterns
- **Customizable**: Add custom prompts for specific data requirements
- **Multiple Formats**: Support for various data types and validation rules

## 🛠️ Installation

### Prerequisites
- Node.js 16+ and npm/yarn
- Firebase project with Firestore enabled
- OpenAI API key and/or Anthropic Claude API key (for AI features)

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Akramovic1/firestore-data-uploader.git
   cd firestore-data-uploader
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. **Open in browser**
   Navigate to `http://localhost:5173`

## 📖 Usage Guide

### **1. Basic Upload**
1. Navigate to the **Upload Data** tab
2. Enter your Firestore collection name
3. Upload your Firebase service account credentials (JSON file)
4. Upload your data file (JSONL format)
5. Click **Start Upload** and monitor progress

### **2. AI Data Generation**
1. Go to the **AI Generate** tab
2. Select or create a custom schema
3. Configure your AI providers (OpenAI/Claude API keys)
4. Specify the number of documents to generate
5. Add custom prompts if needed
6. Generate and download the data

### **3. Custom Schema Management**
1. Click **Custom Schema** in the schema selector
2. Choose to upload a JSON file or create manually
3. Define fields with types, validation rules, and examples
4. Use **AI Generate** to add fields based on descriptions
5. Use **AI Enhance** to improve schemas from example data

### **4. Schema Organization**
1. Click **Manage (#)** to open the Schema Manager
2. Browse, search, and filter your custom schemas
3. Download individual schemas or export all as backup
4. Import schemas from JSON files
5. Edit, delete, or duplicate existing schemas

## 📁 File Formats

### **Firebase Credentials (JSON)**
```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "key-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...",
  "client_email": "firebase-adminsdk-xyz@your-project.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token"
}
```

### **Data File (JSONL)**
```jsonl
{"name": "John Doe", "email": "john@example.com", "age": 30}
{"name": "Jane Smith", "email": "jane@example.com", "age": 25}
{"name": "Bob Johnson", "email": "bob@example.com", "age": 35}
```

### **Custom Schema (JSON)**
```json
{
  "name": "User Profile",
  "description": "Standard user profile schema",
  "category": "Users",
  "fields": [
    {
      "name": "name",
      "type": "string",
      "required": true,
      "description": "Full name of the user",
      "example": "John Doe"
    },
    {
      "name": "email",
      "type": "email",
      "required": true,
      "description": "User email address",
      "example": "john@example.com"
    },
    {
      "name": "age",
      "type": "number",
      "required": false,
      "description": "User age in years",
      "example": 30,
      "validation": { "min": 13, "max": 120 }
    }
  ]
}
```

## 🔧 Configuration

### **AI Provider Setup**
1. Get API keys from [OpenAI](https://platform.openai.com/api-keys) and/or [Anthropic](https://console.anthropic.com/)
2. In the AI Generate tab, click the settings icon
3. Add your API keys for the providers you want to use
4. Keys are stored securely in your browser's local storage

### **Firebase Setup**
1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Firestore Database
3. Generate a service account key:
   - Go to Project Settings → Service Accounts
   - Click "Generate new private key"
   - Download the JSON file

## 🎯 Field Types Supported

- **string**: Text data with optional pattern validation
- **number**: Numeric data with min/max constraints
- **boolean**: True/false values
- **array**: Lists of any data type
- **object**: Nested JSON objects
- **timestamp**: ISO date strings or Date objects
- **email**: Email addresses with validation
- **url**: Valid URL strings

## 🚀 Build & Deploy

### **Development**
```bash
npm run dev        # Start development server
npm run lint       # Run ESLint
npm run build      # Build for production
npm run preview    # Preview production build
```

### **Production Build**
```bash
npm run build
```

The built files will be in the `dist/` directory, ready for deployment to any static hosting service.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Important Notes

- **API Keys**: Never commit API keys to version control. They're stored locally in your browser
- **Service Accounts**: Keep Firebase service account files secure and never share them publicly
- **Data Privacy**: This application processes data locally in your browser - no data is sent to external servers except for AI generation requests
- **Firestore Security**: Ensure your Firestore security rules are properly configured for your use case

## 🆘 Support

If you encounter issues or have questions:

1. Check the browser console for error messages
2. Verify your Firebase credentials and permissions
3. Ensure your JSONL data is properly formatted
4. Check that your Firestore security rules allow writes
5. Validate your custom schema structure

For bugs and feature requests, please open an issue on GitHub.

---

**Made with ❤️ using React, TypeScript, Vite, and Firebase**