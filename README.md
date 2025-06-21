# Book Notes - Personal Reading Tracker

A full-stack web application for tracking books you've read, complete with ratings, personal notes, and automatic cover image fetching.

![Book Notes App](https://img.shields.io/badge/Node.js-Express-green) ![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-blue) ![API](https://img.shields.io/badge/API-Open%20Library-orange)

## 🚀 Features

- **📚 Book Management**: Add, view, and delete books from your personal library
- **⭐ Rating System**: Rate books from 1-5 stars
- **📝 Personal Notes**: Add your thoughts and insights about each book
- **🎨 Automatic Cover Images**: Fetches book covers from Open Library API
- **🔍 Smart Book Lookup**: Automatically finds ISBN and cover data when missing
- **📱 Responsive Design**: Works seamlessly on desktop and mobile devices
- **🔗 External Links**: Click book titles/covers to view on Open Library

## 🛠️ Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **PostgreSQL** - Database
- **EJS** - Template engine
- **Axios** - HTTP client for API calls

### Frontend
- **HTML5/CSS3** - Structure and styling
- **Responsive Design** - Mobile-first approach
- **Google Fonts** - Typography (Merriweather)

### APIs
- **Open Library API** - Book metadata and cover images

## 📋 Prerequisites

Before running this application, make sure you have:

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn package manager

## 🚀 Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/AbhayRajSingh23/Book-Notes-.git
   cd Book-Notes-
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up PostgreSQL database**
   ```sql
   CREATE DATABASE book_notes;
   
   CREATE TABLE books (
       id SERIAL PRIMARY KEY,
       title VARCHAR(255) NOT NULL,
       author VARCHAR(255) NOT NULL,
       isbn VARCHAR(20),
       cover_edition_key VARCHAR(50),
       rating INTEGER CHECK (rating >= 1 AND rating <= 5),
       notes TEXT,
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   ```

4. **Configure database connection**
   
   Update the database configuration in `app.js`:
   ```javascript
   const pool = new Pool({
       user: "your_username",
       host: "localhost",
       database: "book_notes",
       password: "your_password",
       port: 5432,
   });
   ```

5. **Start the application**
   ```bash
   npm start
   ```

6. **Access the application**
   
   Open your browser and navigate to `http://localhost:3000`

## 💡 Usage

### Adding a Book
1. Fill in the book title and author (required)
2. Optionally add ISBN, rating (1-5), and personal notes
3. Click "Add Book" - the app will automatically fetch cover images

### Viewing Books
- Books are displayed in reverse chronological order (newest first)
- Click on book covers or titles to view the book on Open Library
- Each book card shows title, author, rating, and your notes

### Deleting Books
- Use the "Delete" button on each book card to remove it from your library

## 🔧 API Integration

The application integrates with the Open Library API to:
- Automatically fetch ISBNs when not provided
- Retrieve book cover images
- Get Open Library IDs (OLIDs) for additional metadata

**API Endpoints Used:**
- `https://openlibrary.org/search.json` - Book search
- `https://covers.openlibrary.org/b/isbn/{isbn}-M.jpg` - Cover images by ISBN
- `https://covers.openlibrary.org/b/olid/{olid}-M.jpg` - Cover images by OLID

## 📱 Responsive Design

The application is fully responsive with:
- Mobile-first CSS approach
- Flexible grid layouts
- Touch-friendly interfaces
- Optimized typography for different screen sizes

## 🎨 Design Features

- **Warm Color Palette**: Book-themed browns and creams
- **Typography**: Merriweather serif font for readability
- **Visual Hierarchy**: Clear distinction between different content sections
- **Hover Effects**: Interactive buttons and clickable elements
- **Card-based Layout**: Clean, organized book display

## 🚀 Future Enhancements

- [ ] User authentication and multiple user support
- [ ] Book search functionality within the app
- [ ] Export/import book lists
- [ ] Reading progress tracking
- [ ] Book recommendations
- [ ] Categories/tags for books
- [ ] Reading statistics and analytics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Create a Pull Request

## 👨‍💻 Author

**Abhay Raj Singh**
- GitHub: [@AbhayRajSingh23](https://github.com/AbhayRajSingh23)

## 🙏 Acknowledgments

- [Open Library](https://openlibrary.org/) for providing the book data API
- [Google Fonts](https://fonts.google.com/) for the Merriweather font family

---

### 🐛 Known Issues

- Cover images may not load for very obscure books
- ISBN lookup might fail for books not in Open Library database

### 📞 Support

If you encounter any issues or have questions, please [open an issue](https://github.com/AbhayRajSingh23/Book-Notes-/issues) on GitHub.
