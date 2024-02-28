# Music Connect Backend

## Overview

Music Connect is a platform designed to enhance the learning experience of musical instrument students by leveraging social media elements and music comparison technology. The backend of Music Connect supports the iOS application, handling session management, data storage, and music file processing.

## Purpose

The purpose of the backend is to provide a scalable, secure, and efficient infrastructure that supports the real-time needs of the Music Connect application. It facilitates user interactions, stores user and music data, and processes music comparison requests.

## Technologies Used

- **Node.js**: A JavaScript runtime built on Chrome's V8 JavaScript engine, used for creating the server-side environment.
- **Firebase Hosting**: Hosts the backend, providing a scalable infrastructure for web applications and static content.
- **Firebase Functions**: A serverless framework that lets you automatically run backend code in response to events triggered by Firebase features and HTTPS requests.
- **Firebase Authentication**: Manages user authentication and sessions, supporting various authentication methods including email and password, third-party providers, and more.
- **Firebase Firestore**: A NoSQL database for storing and synchronizing data in real-time.

## Serverless API Callable Functions

- **User API**: Manages user data updates and handles operations related to user creation.
- **Posts API**: Supports creating, retrieving, updating, and deleting posts and comments.
- **Music API**: Manages uploading, downloading, and deleting music files associated with user posts or profiles.
- **Groups API**: Facilitates group creation, management, and member interactions.

### Example Endpoints

- `POST /updateUser`: Updates user profile information.
- `GET /posts`: Retrieves posts created by users.
- `POST /uploadMusic`: Allows users to upload music files.
- `POST /createGroup`: Creates a new user group.

## Database Design

### Collections

- **Users**: Stores user profiles, including personal information, and references to posts, music uploads, and groups.
- **Posts**: Contains user-generated content, comments, and associated music files.
- **Music**: Holds information about music files, including metadata and storage paths.
- **Groups**: Manages information about user groups, including membership and associated posts.

### Relationships

- A user can have multiple posts, music uploads, and group memberships.
- Each post can include one or more music files and comments.
- Music files are linked to posts and user profiles for easy retrieval and management.
- Groups contain multiple users and can have their own posts.
