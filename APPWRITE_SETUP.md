# Appwrite Migration Guide for YNG Client

This guide will help you migrate from MongoDB to Appwrite for the YNG Client API.

## Step 1: Create an Appwrite Account

1. Go to [Appwrite Cloud](https://cloud.appwrite.io/) or set up a self-hosted instance
2. Create a new account or sign in
3. Create a new project called "YNG Client"

## Step 2: Get Your Project Configuration

1. In your Appwrite console, go to your project
2. Note down the following information:
   - **Project ID**: Found in Settings > General
   - **Endpoint**: Usually `https://cloud.appwrite.io/v1` for cloud
   - **API Key**: Create one in Settings > API Keys with the following permissions:
     - `databases.read`
     - `databases.write`
     - `documents.read`
     - `documents.write`

## Step 3: Update Environment Variables

Update your `.env` file with the following values:

```env
# Appwrite Configuration
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your-actual-project-id
APPWRITE_API_KEY=your-actual-api-key
APPWRITE_DATABASE_ID=yng-client-db
APPWRITE_USERS_COLLECTION_ID=users
APPWRITE_CAPES_COLLECTION_ID=capes
```

Replace the placeholder values with your actual Appwrite credentials.

## Step 4: Create Database and Collections

1. In your Appwrite console, go to **Databases**
2. Create a new database with ID: `yng-client-db`

### Create Users Collection

1. Create a new collection with ID: `users`
2. Add the following attributes:

| Attribute Name | Type | Size | Required | Array | Default |
|----------------|------|------|----------|-------|---------|
| minecraftUuid | String | 255 | Yes | No | - |
| minecraftUsername | String | 255 | Yes | No | - |
| email | Email | 255 | No | No | - |
| unlockedCapes | String | 255 | No | Yes | [] |
| selectedCape | String | 255 | No | No | null |
| stats | String | 10000 | No | No | {} |
| achievements | String | 255 | No | Yes | [] |
| isActive | Boolean | - | No | No | true |

3. Create indexes:
   - `minecraftUuid` (unique)
   - `minecraftUsername`

### Create Capes Collection

1. Create a new collection with ID: `capes`
2. Add the following attributes:

| Attribute Name | Type | Size | Required | Array | Default |
|----------------|------|------|----------|-------|---------|
| id | String | 255 | Yes | No | - |
| name | String | 255 | Yes | No | - |
| description | String | 1000 | Yes | No | - |
| rarity | Enum | - | No | No | common |
| unlockCondition | String | 1000 | Yes | No | - |
| requirements | String | 5000 | No | No | {} |
| textureUrl | String | 500 | Yes | No | - |
| textureHash | String | 255 | Yes | No | - |
| isActive | Boolean | - | No | No | true |
| isDefault | Boolean | - | No | No | false |
| createdBy | String | 255 | No | No | system |
| category | Enum | - | No | No | official |
| metadata | String | 5000 | No | No | {} |

3. For enum fields:
   - **rarity**: `common`, `uncommon`, `rare`, `epic`, `legendary`
   - **category**: `official`, `community`, `event`, `custom`

4. Create indexes:
   - `id` (unique)
   - `rarity`
   - `category`
   - `isActive`

## Step 5: Set Permissions

For both collections, set the following permissions:

### Users Collection
- **Create**: Server (API Key)
- **Read**: Server (API Key) 
- **Update**: Server (API Key)
- **Delete**: Server (API Key)

### Capes Collection
- **Create**: Server (API Key)
- **Read**: Server (API Key), Any (for public cape listing)
- **Update**: Server (API Key)
- **Delete**: Server (API Key)

## Step 6: Install Dependencies and Test

1. Install the new dependencies:
   ```bash
   cd api
   npm install
   ```

2. Set up default capes:
   ```bash
   node scripts/setup-default-capes.js
   ```

3. Start the server:
   ```bash
   npm run dev
   ```

4. Test the API endpoints:
   ```bash
   # Health check
   curl http://localhost:3001/api/health
   
   # Get capes
   curl http://localhost:3001/api/capes
   ```

## Step 7: Migrate Existing Data (Optional)

If you have existing MongoDB data, you can create a migration script to transfer it to Appwrite. The new models are compatible with the existing data structure.

## Troubleshooting

### Common Issues:

1. **403 Forbidden**: Check your API key permissions
2. **404 Not Found**: Verify database and collection IDs match your .env file
3. **Invalid Document**: Make sure all required fields are provided

### Debug Mode:

Enable debug logging by adding to your `.env`:
```env
DEBUG=appwrite:*
```

## Features Gained with Appwrite:

- ✅ Built-in authentication system (can be extended later)
- ✅ Real-time subscriptions
- ✅ Built-in file storage
- ✅ Automatic backups (on cloud)
- ✅ Web dashboard for data management
- ✅ Better scalability
- ✅ No server management needed (with cloud)

Your YNG Client API is now powered by Appwrite! 🚀