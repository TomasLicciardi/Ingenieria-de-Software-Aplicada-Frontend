// Servidor HTTP simple con soporte explícito para manifest.webmanifest
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const https = require('https');

const PORT = 8095;
const ROOT_DIR = 'C:/Users/tomil/Desktop/Ingenieria De Software Aplicada/frontend/blog-app-ionic/www';
const BACKEND_HOST = 'localhost';
const BACKEND_PORT = 8080;

// Mapa de tipos MIME
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json', // Tipo MIME específico para manifests
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    // Parsear la URL
  const parsedUrl = url.parse(req.url);
  let pathname = parsedUrl.pathname;
  // Manejar el preflight OPTIONS para CORS
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Max-Age': '86400', // 24 horas
      'Content-Length': '0'
    });
    res.end();
    return;
  }
  // Solicitudes para verificar la salud del servidor
  if (pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'UP', timestamp: new Date().toISOString() }));
    return;
  }

  // Enviar solicitudes API al backend
  if (pathname.startsWith('/api/')) {
    console.log(`Proxying request to backend: ${pathname}`);
    
    // Recolectar el cuerpo de la solicitud primero si es necesario
    let requestBody = [];
    
    req.on('data', chunk => {
      requestBody.push(chunk);
    });
    
    req.on('end', () => {
      requestBody = Buffer.concat(requestBody);
        // Configuración de la solicitud al backend
      const options = {
        hostname: BACKEND_HOST,
        port: BACKEND_PORT,
        path: pathname + (parsedUrl.search || ''),
        method: req.method,
        headers: {
          ...req.headers,
          host: `${BACKEND_HOST}:${BACKEND_PORT}`,
          'Content-Length': requestBody.length
        }
      };
      
      // Eliminar encabezados que pueden causar problemas
      delete options.headers['accept-encoding'];
        // Añadir encabezados específicos para autenticación
      if (pathname.includes('/api/authenticate') || pathname.includes('/api/register')) {
        options.headers['Content-Type'] = 'application/json';
        options.headers['Accept'] = 'application/json';
        // Eliminar cabeceras que puedan causar problemas
        delete options.headers['origin'];
        delete options.headers['referer'];
        console.log('Authentication request detected. Request body:', requestBody.toString());
        console.log('Auth headers:', JSON.stringify(options.headers, null, 2));
      }
      
      // Crear solicitud al backend
      const proxyReq = http.request(options, (proxyRes) => {
        console.log(`Proxy response status: ${proxyRes.statusCode}`);
        
        // Recopilar datos de respuesta
        let responseBody = [];
        
        proxyRes.on('data', (chunk) => {
          responseBody.push(chunk);
        });
        
        proxyRes.on('end', () => {
          responseBody = Buffer.concat(responseBody);
          
          try {
            // Intentar analizar la respuesta como JSON
            const jsonResponse = JSON.parse(responseBody.toString());
            console.log('Backend response (parsed):', JSON.stringify(jsonResponse).substring(0, 200) + "...");
          } catch (e) {
            // No es JSON o hay un error al analizar
            console.log('Backend response length:', responseBody.length);
          }
          
          // Copiar encabezados de respuesta, añadiendo CORS
          let respHeaders = {
            ...proxyRes.headers,
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept',
            'Access-Control-Expose-Headers': 'Authorization, Link, X-Total-Count'
          };
          
          res.writeHead(proxyRes.statusCode, respHeaders);
          res.end(responseBody);
        });
      });
      
      // Manejar errores de la solicitud proxy
      proxyReq.on('error', (err) => {
        console.error(`Proxy error: ${err.message}`);
        res.writeHead(502, { 'Content-Type': 'text/plain' });
        res.end('Proxy Error: ' + err.message);
      });
      
      // Enviar el cuerpo de la solicitud al backend
      proxyReq.write(requestBody);
      proxyReq.end();
    });
    
    return;
  }  
  // Manejar el caso especial de manifest.webmanifest
  if (pathname === '/manifest.webmanifest') {
    const manifestPath = path.join(ROOT_DIR, 'manifest.webmanifest');
    fs.readFile(manifestPath, (err, data) => {
      if (err) {
        // Si falta el archivo en la ubicación normal, intentar usar el de la carpeta public
        const altManifestPath = path.join('C:/Users/tomil/Desktop/Ingenieria De Software Aplicada/frontend/blog-app-ionic/public', 'manifest.webmanifest');
        fs.readFile(altManifestPath, (altErr, altData) => {
          if (altErr) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Manifest not found');
            console.error('Manifest not found in either location');
            return;
          }
          
          // Servir desde la ubicación alternativa
          res.writeHead(200, { 'Content-Type': 'application/manifest+json' });
          res.end(altData);
          console.log('Served manifest from alternate location');
        });
        return;
      }
      
      // Servir desde la ubicación normal
      res.writeHead(200, { 'Content-Type': 'application/manifest+json' });
      res.end(data);
    });
    return;
  }
  
  // Manejo especial para el archivo ngsw.json para estabilizar las actualizaciones del service worker
  if (pathname === '/ngsw.json') {
    console.log('Solicitando ngsw.json - Estabilizando contenido');
    const ngswPath = path.join(ROOT_DIR, 'ngsw.json');
    
    fs.readFile(ngswPath, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('ngsw.json no encontrado');
        console.error('ngsw.json no encontrado');
        return;
      }
      
      try {
        // Parseamos el JSON
        const ngswData = JSON.parse(data.toString());
        
        // Estabilizamos el hash para evitar actualizaciones constantes
        if (ngswData.hashTable) {
          // Estabilizar el hash de archivos críticos como index.html
          if (ngswData.hashTable['/index.html']) {
            console.log('Estabilizando hash de index.html');
            // Solo modificamos el hash si no coincide con nuestra versión estable
            const stableHash = '1234567890abcdef'; // Hash ficticio estable
            if (ngswData.hashTable['/index.html'] !== stableHash) {
              ngswData.hashTable['/index.html'] = stableHash;
            }
          }
        }
        
        // Servir el ngsw.json modificado
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(ngswData));
        console.log('ngsw.json servido con hash estabilizado');
      } catch (e) {
        console.error('Error al procesar ngsw.json:', e);
        // En caso de error, servir el archivo original
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(data);
      }
    });
    return;
  }
  
  // Ruta al archivo en el sistema de archivos
  let filePath = path.join(ROOT_DIR, pathname);
  
  // Si la ruta termina con /, servir index.html
  if (pathname.endsWith('/')) {
    filePath = path.join(filePath, 'index.html');
  }
  
  // Obtener la extensión del archivo
  const extname = String(path.extname(filePath)).toLowerCase();
  
  // Determinar el tipo de contenido
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';
  
  // Leer el archivo
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // Si la ruta solicitada no es un archivo, intentar servir index.html (para SPA)
        if (pathname !== '/' && !pathname.includes('.')) {
          fs.readFile(path.join(ROOT_DIR, 'index.html'), (err, content) => {
            if (err) {
              res.writeHead(404, { 'Content-Type': 'text/plain' });
              res.end('Not Found');
            } else {
              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(content, 'utf-8');
            }
          });
          return;
        }
        
        // Archivo no encontrado
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end(`File Not Found: ${pathname}`);
      } else {
        // Error del servidor
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      // Éxito - servir el archivo
      res.writeHead(200, { 
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*', // Permitir CORS
        'Cache-Control': 'no-store' // Deshabilitar caché
      });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log(`Serving content from ${ROOT_DIR}`);
  console.log('Press Ctrl+C to stop the server');
});
