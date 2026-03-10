https://teja-0504.github.io/clothfit/

# clothfit

I read through the repo (`teja-0504/clothfit`). It’s a small web app:

- **Frontend:** `index.html`, `shopping.html`, `styles.css`, `app.js`
- **Backend:** `server.py` (Flask + SQLite `users.db`)
- **Body measurement logic:** `analysis.py` (MediaPipe + OpenCV)
- **Run instructions currently in:** `SPEC.md` (very minimal)
- **Assets:** `photos/` and `uploads/`

Here’s a filled **README.md** you can paste in (replace your current `# clothfit`):

```markdown
# ClothFit

ClothFit is a simple **AI-assisted size recommendation** web app. Users enter basic details, upload (or capture) a full-body photo, and the app estimates body measurements and recommends clothing sizes (shirt, pants, jacket). It also stores user profiles in a local SQLite database.

## Features

- Multi-step UI (Details → Photo → Results)
- Photo upload + camera capture (browser)
- Backend API that:
  - checks image blur
  - validates full-body presence
  - estimates measurements (shoulder/chest/waist/hip) and body shape
  - returns recommended sizes
- Saves users + measurements + sizes to **SQLite (`users.db`)**
- Profile page & shopping page UI (frontend)

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript (`index.html`, `styles.css`, `app.js`)
- **Backend:** Python + Flask (`server.py`)
- **Computer Vision / Pose:** MediaPipe + OpenCV (`analysis.py`)
- **Database:** SQLite (`users.db`)

## Project Structure

```
clothfit/
├─ index.html            # Main app UI
├─ shopping.html         # Shopping UI
├─ styles.css            # Styling
├─ app.js                # Frontend logic + API calls
├─ server.py             # Flask backend + SQLite persistence
├─ analysis.py           # Body measurement + blur/full-body validation
├─ requirements.txt      # Python dependencies
├─ SPEC.md               # Minimal run notes (can be removed/merged into README)
├─ uploads/              # Uploaded photos saved by backend
└─ photos/               # Product/asset images (e.g., photos/shirt)
```

## Setup & Run (Local)

### 1) Install Python dependencies

```bash
pip install -r requirements.txt
```

### 2) Start the backend server

```bash
python server.py
```

You should see something like:

- Server running at: `http://localhost:5000`

### 3) Open the frontend

Option A (simple): open `index.html` directly in your browser.

Option B (recommended): serve the folder using any static server (so browser features work smoothly). Example:

```bash
python -m http.server 8000
```

Then open:

- `http://localhost:8000/index.html`

## API Endpoints (Backend)

Base URL: `http://localhost:5000`

- `POST /analyze`
  - Form-data: `photo` (image), plus optional fields like `name`, `email`, `phone`, `gender`, `age`, `preferred_category`
  - Returns: `user_id`, `measurements`, `sizes`

- `GET /get-user/<user_id>`
  - Returns saved user data

- `GET /get-profile/<user_id>`
  - Returns profile + measurements + sizes

- `POST /update-profile`
  - JSON body: `{ user_id, name?, email?, phone?, gender?, age?, preferred_category? }`

- `POST /update-measurements`
  - JSON body: `{ user_id, measurements, sizes }`

- `POST /check-user`
  - JSON body: `{ email }`

- `GET /uploads/<filename>`
  - Serves uploaded images

## Notes / Limitations

- Measurement conversion uses a rough assumption of average height (see `analysis.py`), so results are **approximate**.
- Uploaded images are saved into `uploads/` and user records into `users.db`.
- Current frontend calls the backend at `http://127.0.0.1:5000` (see `app.js`). If you change ports/host, update that URL.

## License

Add a license if you plan to publish or share this project.
```

If you want, I can also **update the README file in your repo**—tell me if you want:
1) me to paste the final text only (you commit it), or  
2) you want me to push the README update to `main` (I’ll need the current README `BlobSha`, it’s empty in your message).
