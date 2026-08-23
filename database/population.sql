#* { box-sizing: border-box; font-family: Arial, sans-serif; }

body {
  background: #f4f4f4;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  margin: 0;
}

.container {
  background: white;
  padding: 2rem;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  width: 320px;
}

h1 { text-align: center; font-size: 1.4rem; margin-bottom: 1rem; }

.tabs { display: flex; margin-bottom: 1rem; }
.tab {
  flex: 1;
  padding: 0.5rem;
  border: none;
  background: #eee;
  cursor: pointer;
}
.tab.active { background: #4a90e2; color: white; }

form { display: flex; flex-direction: column; gap: 0.7rem; }
.hidden { display: none; }

input {
  padding: 0.6rem;
  border: 1px solid #ccc;
  border-radius: 5px;
}

button[type="submit"] {
  padding: 0.6rem;
  background: #4a90e2;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.message { font-size: 0.85rem; text-align: center; }
.navbar{
    display:flex;
    justify-content: space-between;
    align-items: center;
    background: #1e1e2f;
    padding: 1rem 2rem;
    color: white;
}

.nav-logo{
    font-weight: bold;
    font-size: 1.2rem;
}

.nav-search input{
    border: none;
    padding: 0.4rem 0.8rem;
    outline: none;
}

.nav-search button{
    border: none;
    background:#4a90e2;
    color: white;
    padding: 0.4rem 0.7rem;
    cursor: pointer;
}
.logout-btn {
  background: #e94e4e;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 5px;
  cursor: pointer;
}

.dashboard-content {
  padding: 2rem;
  text-align: center;
}
.rides-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 400px;
  margin: 1.5rem auto;
}

.ride-card {
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 1rem;
  text-align: left;
}