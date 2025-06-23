import { defineConfig } from 'vite' 
import react from '@vitejs/plugin-react' 

// https://vitejs.dev/config/ 
export default defineConfig({ 
  plugins: [react()], 
  server: { 
    proxy: { 
      // Proxy API requests to the backend server 
      '/api': { 
        target: 'http://localhost:3001', // Your backend server address 
        changeOrigin: true, // Recommended for most cases 
        // secure: false, // Uncomment if your backend is on HTTPS with self-signed cert 
      }, 
    } 
  } 
}) 