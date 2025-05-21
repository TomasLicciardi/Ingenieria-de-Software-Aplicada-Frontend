import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CacheService {
  
  private readonly VERSION = 'cache-v1';
  
  constructor() {
    this.initCache();
  }
  
  /**
   * Inicializa la estructura de caché si no existe
   */
  private initCache(): void {
    if (!localStorage.getItem(`${this.VERSION}-metadata`)) {
      localStorage.setItem(`${this.VERSION}-metadata`, JSON.stringify({
        lastSync: new Date().toISOString(),
        version: this.VERSION
      }));
    }
  }
  
  /**
   * Guarda datos en caché con una clave específica
   */
  public saveData(key: string, data: any): void {
    localStorage.setItem(`${this.VERSION}-${key}`, JSON.stringify({
      timestamp: new Date().toISOString(),
      data: data
    }));
  }
  
  /**
   * Obtiene datos de la caché
   * @returns Los datos o null si no existen
   */
  public getData<T>(key: string): T | null {
    const item = localStorage.getItem(`${this.VERSION}-${key}`);
    if (item) {
      const parsed = JSON.parse(item);
      return parsed.data as T;
    }
    return null;
  }
  
  /**
   * Verifica si la caché para una clave está actualizada
   * @param key La clave de la caché
   * @param maxAgeMinutes Edad máxima en minutos para considerar la caché válida
   */
  public isCacheValid(key: string, maxAgeMinutes: number = 60): boolean {
    const item = localStorage.getItem(`${this.VERSION}-${key}`);
    if (item) {
      const parsed = JSON.parse(item);
      const timestamp = new Date(parsed.timestamp);
      const now = new Date();
      
      // Calcular diferencia en minutos
      const diffMs = now.getTime() - timestamp.getTime();
      const diffMinutes = Math.floor(diffMs / 60000);
      
      return diffMinutes < maxAgeMinutes;
    }
    return false;
  }
    /**
   * Agrega un elemento pendiente para sincronizar
   */
  public addPendingItem(type: 'blogs' | 'posts', item: any): any {
    const key = `pending-${type}`;
    const pendingItems = this.getData<any[]>(key) || [];
    
    // Crear copia para no modificar el original
    const itemToSave = {...item};
    
    // Marcar como pendiente de sincronización
    itemToSave.pendingSync = true;
    
    // Si no tiene ID o es un ID del servidor, asignar ID temporal
    if (!itemToSave.id || (typeof itemToSave.id === 'number')) {
      itemToSave.id = `temp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }
    
    pendingItems.push(itemToSave);
    this.saveData(key, pendingItems);
    
    return itemToSave;
  }
  
  /**
   * Obtiene los elementos pendientes de sincronización
   */
  public getPendingItems<T>(type: 'blogs' | 'posts'): T[] {
    return this.getData<T[]>(`pending-${type}`) || [];
  }
  
  /**
   * Elimina los elementos pendientes de sincronización
   */
  public clearPendingItems(type: 'blogs' | 'posts'): void {
    this.saveData(`pending-${type}`, []);
  }
    /**
   * Elimina un elemento pendiente específico
   */
  public removePendingItem(type: 'blogs' | 'posts', id: string | number): void {
    const pendingItems = this.getPendingItems<any>(type);
    const updatedItems = pendingItems.filter((item: any) => item.id !== id);
    this.saveData(`pending-${type}`, updatedItems);
  }
  
  /**
   * Actualiza la metadata de la caché
   */
  public updateMetadata(): void {
    localStorage.setItem(`${this.VERSION}-metadata`, JSON.stringify({
      lastSync: new Date().toISOString(),
      version: this.VERSION
    }));
  }
  
  /**
   * Limpia toda la caché (excepto elementos pendientes)
   */
  public clearCache(): void {
    // Guardar los pendientes primero
    const pendingBlogs = this.getPendingItems('blogs');
    const pendingPosts = this.getPendingItems('posts');
    
    // Limpiar todas las claves que empiecen con la versión actual
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(this.VERSION) && 
          !key.includes('pending-blogs') && 
          !key.includes('pending-posts')) {
        localStorage.removeItem(key);
      }
    });
    
    // Restaurar pendientes
    this.saveData('pending-blogs', pendingBlogs);
    this.saveData('pending-posts', pendingPosts);
    
    // Reinicializar metadata
    this.initCache();
  }
}
