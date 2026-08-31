# Campus Carpool & Student Ride Sharing Management System

A university ride-sharing platform designed for students (such as BRAC University) to host rides, find open carpools, automatically match routes and vehicle preferences, chat in group rooms, track ride history, calculate fare splits, and build trust through peer credibility ratings.

---

## Key Problems Fixed from Original Code

1. **Fixed Database Name Mismatch**:
   - `schema.sql` created `carpool_db`, but `population.sql` had `USE carpool_db2;`. Fixed to uniformly use `carpool_db`.
2. **Fixed Chat Architecture (1-on-1 vs Group Chat)**:
   - Original `chat_room` had `ride_request_id UNIQUE` which only allowed 1-on-1 chats per individual join request.
   - **Fix**: Re-anchored `chat_room` to `ride_group_id` (`UNIQUE (ride_group_id)`) so every ride group has a dedicated group chat room where the host and all accepted passengers communicate together.
3. **Fixed Review Schema Flaw**:
   - Original `review` only had `student_id` (ambiguous whether author or target) and lacked `reviewed_student_id` and `ride_group_id`.
   - **Fix**: Updated `review` table to record `reviewer_id`, `reviewed_student_id`, `ride_group_id`, `rating_point` (1-5), and `comment`. Ratings now dynamically update the student's `credibility_score`.
4. **Fixed Search Button & Multi-Stop Query Failure**:
   - Normalized `ride_stop` tables (separate rows for pickup `stop_order=1` and dropoff `stop_order=2`) caused standard single JOIN queries to fail when filtering by both pickup and destination.
   - **Fix**: Implemented an optimized query joining pickup stop (`stop_type = 'pickup'`) and dropoff stop (`stop_type = 'dropoff'`) with flexible partial string matching (`LIKE %destination%`), vehicle filtering, and capacity checking (`current_count < max_capacity`).

---

## 6 Implemented Core Features

1. **Ride Request & Ride Group Creation**:
   - Host can offer a ride with departure time, vehicle category (Auto, CNG, Sedan), max capacity, total fare, pickup, and dropoff.
   - Passengers can search and submit join requests.
   - Host reviews incoming requests with applicant credibility scores and can **Accept** or **Reject**.
   - Upon acceptance, passenger is enrolled in `rider`, seat count increments, group chat access is granted, and fare split updates.
2. **AUTO Matching Engine**:
   - Matches students based on destination, pickup, preferred vehicle (`auto`, `cng`, `car`, `any`), target time, and host credibility rating.
   - Also pools co-riders (other students looking for the same route) to team up.
   - Saves active match requests when no immediate open ride is found.
3. **In-App Group Chat**:
   - Dedicated group chat room per ride group.
   - Auto-includes host and all accepted riders with live timestamps and credibility score badges.
4. **Ride History & Booking Management**:
   - Organizes rides into Hosted Rides, Joined Rides, and Pending Requests.
   - Hosts can manage status (`open` -> `in_progress` -> `completed` -> `cancelled`).
5. **Rating & Review System**:
   - Upon ride completion, participants can submit 1-5 star ratings and feedback.
   - The recipient's `credibility_score` updates in real time based on their running average rating.
6. **Fare Split Calculator**:
   - Dynamic split: $\text{Fare per person} = \frac{\text{Total Fare}}{\text{Current Count}}$.
   - Interactive simulator slider, vehicle selector, and tier breakdown table.

---

## Getting Started

### 1. Run with Built-in Embedded SQLite (Zero-Configuration)
```bash
cd carpool_system
npm start
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 2. Run with MySQL
1. Import the fixed SQL scripts into MySQL:
   ```bash
   mysql -u root -p < database/schema.sql
   mysql -u root -p < database/population.sql
   ```
2. Edit `.env`:
   ```ini
   DB_TYPE=mysql
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=carpool_db
   ```
3. Start the server:
   ```bash
   npm start
   ```

---

## Seed Accounts (Password: `password123`)
Use the **Quick Switch User** dropdown at the top of the web app or sign in with:
- **Aisha Rahman**: `aisha@bracu.ac.bd` (Host - Auto ride to Dhanmondi)
- **Rahim Ahmed**: `rahim@bracu.ac.bd` (Host - CNG ride to Dhanmondi)
- **Karim Hasan**: `karim@bracu.ac.bd` (Host - Car ride to Dhanmondi)
- **Mim Akter**: `mim@bracu.ac.bd` (Rider - Joined Aisha & Fahim)
- **Shafin Islam**: `shafin@bracu.ac.bd` (Rider - Joined Fahim)
- **Tania Sultana**: `tania@bracu.ac.bd` (Rider - Joined Karim)
