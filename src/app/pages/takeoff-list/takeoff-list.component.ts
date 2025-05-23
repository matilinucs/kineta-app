import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

// Importamos los componentes modulares
import { PageTitleComponent } from '../../components/page-title/page-title.component';
import { AddButtonComponent } from '../../components/add-button/add-button.component';
import { SearchBarComponent } from '../../components/search-bar/search-bar.component';
import { DataTableComponent } from '../../components/data-table/data-table.component';
import { TablePaginationComponent } from '../../components/table-pagination/table-pagination.component';
import { FilterDialogComponent } from '../../components/filter-dialog/filter-dialog.component';
import { ColumnDialogComponent } from '../../components/column-dialog/column-dialog.component';

// Importamos los tipos
import { TableColumn, TableData, SortConfig, TableFilter } from '../../types/table.types';

@Component({
  selector: 'app-takeoff-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PageTitleComponent,
    AddButtonComponent,
    SearchBarComponent,
    DataTableComponent,
    TablePaginationComponent,
    FilterDialogComponent,
    ColumnDialogComponent
  ],
  templateUrl: './takeoff-list.component.html',
  styleUrl: './takeoff-list.component.scss'
})
export class TakeoffListComponent implements OnInit {
  // Propiedades de la página
  pageTitle: string = 'Gestión de Cubicaciones';
  
  // Propiedades de búsqueda
  searchTerm: string = '';
  
  // Propiedades de columnas y tabla
  columns: TableColumn[] = [
    { key: 'id', label: 'Código', type: 'text', sortable: true, draggable: false, visible: true },
    { key: 'proyecto', label: 'Proyecto', type: 'text', sortable: true, draggable: true, visible: true },
    { key: 'nombre', label: 'Nombre', type: 'text', sortable: true, draggable: true, visible: true },
    { key: 'fecha', label: 'Fecha', type: 'date', sortable: true, draggable: true, visible: true },
    { key: 'estado', label: 'Estado', type: 'text', sortable: true, draggable: true, visible: true },
    { key: 'monto', label: 'Monto', type: 'number', sortable: true, draggable: true, visible: true },
    { key: 'actions', label: 'Acciones', type: 'actions', sortable: false, draggable: false, visible: true }
  ];
  defaultColumns: TableColumn[] = JSON.parse(JSON.stringify(this.columns));
  columnOrder: string[] = this.columns.map(col => col.key);
  defaultColumnOrder: string[] = [...this.columnOrder];
  tempColumnState: Set<string> = new Set(); // Estado temporal para las columnas en el diálogo
  draggedColumn: string | null = null;
  
  // Propiedades de ordenamiento
  sortConfig: SortConfig = {
    column: null,
    direction: 'asc'
  };
  sortColumn: string | null = null;
  sortDirection: 'asc' | 'desc' = 'asc';
  
  // Propiedades de paginación
  paginationConfig = {
    currentPage: 1,
    itemsPerPage: 10,
    totalItems: 0
  };
  currentPage = 1;
  itemsPerPage = 10;
  totalItems = 0;

  // Propiedades de filtros
  columnTypes: { [key: string]: 'text' | 'date' | 'number' } = {
    id: 'text',
    proyecto: 'text',
    nombre: 'text',
    fecha: 'date',
    estado: 'text',
    monto: 'number',
    actions: 'text'
  };

  uniqueValues: { [key: string]: string[] } = {};

  columnLabels: { [key: string]: string } = {
    id: 'Código',
    proyecto: 'Proyecto',
    nombre: 'Nombre',
    fecha: 'Fecha',
    estado: 'Estado',
    monto: 'Monto',
    actions: 'Acciones'
  };

  filters: {
    [key: string]: {
      type: 'text' | 'date' | 'number';
      value?: string;
      from?: string | number | null;
      to?: string | number | null;
    };
  } = {};

  // Define interface for cubicacion objects
  cubicaciones: Array<{
    id: string;
    proyecto: string;
    nombre: string;
    fecha: string;
    estado: string;
    monto: string;
    [key: string]: string;
  }> = [
    {
      id: 'CUB-2023-001',
      proyecto: 'Edificio Central',
      nombre: 'Torre Central',
      fecha: '15/05/2023',
      estado: 'activo',
      monto: '$48.370.000'
    },
    {
      id: 'CUB-2023-002',
      proyecto: 'Parque Industrial',
      nombre: 'Edificio Norte',
      fecha: '22/05/2023',
      estado: 'activo',
      monto: '$73.290.500'
    },
    {
      id: 'CUB-2023-003',
      proyecto: 'Torre Norte',
      nombre: 'Bodega Industrial',
      fecha: '30/05/2023',
      estado: 'inactivo',
      monto: '$88.560.750'
    }
  ];

  originalData: any[] = [];
  data: any[] = [];
  showFilterMenu = false;
  showColumnMenu = false;
  originalCubicaciones = [...this.cubicaciones];
  hasActiveFilters = false;
  pinnedItems: Set<string> = new Set(); // Almacena IDs de filas fijadas
  // --- PINNING Y ORDEN ORIGINAL ---
  private originalIndexMap: { [id: string]: number } = {};

  constructor(private router: Router) {
    this.totalItems = this.cubicaciones.length;
    this.paginationConfig.totalItems = this.totalItems;
    this.initializeFilters();
    this.updateUniqueValues();
    this.cubicaciones.forEach((c, i) => this.originalIndexMap[c.id] = i);
  }

  ngOnInit() {
    // Guardar una copia de los datos originales
    this.originalData = [...this.data];
  }

  getColumnLabel(colId: string): string {
    return this.columnLabels[colId] || colId;
  }
  
  // Métodos para Search Bar
  onSearchChange(value: string): void {
    this.searchTerm = value;
    this.applySearch();
  }
  
  onSearchSubmit(value: string): void {
    this.searchTerm = value;
    this.applySearch();
  }
  
  applySearch(): void {
    if (!this.searchTerm.trim()) {
      this.resetSearch();
      return;
    }
    
    const searchTerm = this.searchTerm.toLowerCase().trim();
    const filtered = this.originalCubicaciones.filter(item => {
      if (this.pinnedItems.has(item.id)) return false;
      return Object.keys(item).some(key => {
        if (key !== 'actions') {
          const value = String(item[key]).toLowerCase();
          return value.includes(searchTerm);
        }
        return false;
      });
    });
    const pinned = this.originalCubicaciones.filter(item => this.pinnedItems.has(item.id));
    this.cubicaciones = [...pinned, ...filtered];
    this.currentPage = 1;
    this.paginationConfig.currentPage = 1;
    this.totalItems = this.cubicaciones.length;
    this.paginationConfig.totalItems = this.totalItems;
  }
  
  resetSearch(): void {
    this.cubicaciones = [...this.originalCubicaciones];
    this.applyFilters();
  }
  
  // Métodos para diálogos
  toggleFilterDialog(): void {
    this.showFilterMenu = !this.showFilterMenu;
  }
  
  toggleColumnDialog(): void {
    this.showColumnMenu = !this.showColumnMenu;
  }

  private initializeFilters() {
    for (const column of this.columnOrder) {
      if (column !== 'actions') {
        this.filters[column] = {
          type: this.columnTypes[column],
          value: '',
        };
        if (this.columnTypes[column] === 'date' || this.columnTypes[column] === 'number') {
          this.filters[column].from = null;
          this.filters[column].to = null;
        }
      }
    }
  }

  private updateUniqueValues() {
    this.columnOrder.forEach(column => {
      if (this.columnTypes[column] === 'text' && column !== 'actions') {
        const values = new Set(this.cubicaciones.map(item => item[column]));
        this.uniqueValues[column] = Array.from(values).sort();
      }
    });
  }

  resetFilters() {
    this.initializeFilters();
    this.hasActiveFilters = false;
    this.cubicaciones = [...this.originalCubicaciones];
    this.showFilterMenu = false;
  }

  closeFilterMenu(): void {
    this.showFilterMenu = false;
  }

  clearFilters(): void {
    // Limpiar valores manteniendo la estructura
    Object.keys(this.filters).forEach(column => {
      if (this.filters[column]) {
        this.filters[column].value = '';
        if (this.columnTypes[column] === 'date' || this.columnTypes[column] === 'number') {
          this.filters[column].from = null;
          this.filters[column].to = null;
        }
      }
    });

    this.hasActiveFilters = false;
    const pinned = this.originalCubicaciones.filter(item => this.pinnedItems.has(item.id));
    const unpinned = this.originalCubicaciones.filter(item => !this.pinnedItems.has(item.id));
    this.cubicaciones = [...pinned, ...unpinned];
    this.totalItems = this.cubicaciones.length;
    this.paginationConfig.totalItems = this.totalItems;
    this.currentPage = 1;
    this.paginationConfig.currentPage = 1;
  }

  applyFilters(newFilters?: { [key: string]: TableFilter }): void {
    // Actualiza los filtros si se reciben desde el componente
    if (newFilters) {
      this.filters = newFilters;
    }
    let filteredData = this.originalCubicaciones.filter(item => !this.pinnedItems.has(item.id));
    // Aplicar todos los filtros
    for (const col in this.filters) {
      const filter = this.filters[col];

      // Skip if filter is empty
      if (filter.type === 'text' && (!filter.value || filter.value === '')) continue;
      if ((filter.type === 'date' || filter.type === 'number') && 
          filter.from == null && filter.to == null) continue;
      
      switch (filter.type) {
        case 'text':
          filteredData = filteredData.filter(item =>
            filter.value ? String(item[col]).toLowerCase().includes(filter.value.toLowerCase()) : true
          );
          break;
          
        case 'date':
          if (filter.from || filter.to) {
            filteredData = filteredData.filter(item => {
              const [day, month, year] = item[col].split('/').map(Number);
              const itemDate = new Date(year, month - 1, day);
              let matchesFrom = true;
              let matchesTo = true;
              if (filter.from) {
                const filterFrom = new Date(filter.from as string);
                matchesFrom = itemDate >= filterFrom;
              }
              if (filter.to) {
                const filterTo = new Date(filter.to as string);
                matchesTo = itemDate <= filterTo;
              }
              return matchesFrom && matchesTo;
            });
          }
          break;
          
        case 'number':
          if (filter.from !== null || filter.to !== null) {
            filteredData = filteredData.filter(item => {
              const value = parseFloat(item[col].replace(/[^0-9.-]+/g, ""));
              let matchesFrom = true;
              let matchesTo = true;
              if (filter.from !== null) {
                matchesFrom = value >= (parseFloat(filter.from as string));
              }
              if (filter.to !== null) {
                matchesTo = value <= (parseFloat(filter.to as string));
              }
              return matchesFrom && matchesTo;
            });
          }
          break;
      }
    }
    const pinned = this.originalCubicaciones.filter(item => this.pinnedItems.has(item.id));
    this.cubicaciones = [...pinned, ...filteredData];
    this.totalItems = this.cubicaciones.length;
    this.currentPage = 1;
  }
  nuevaCubicacion() {
    console.log('Creando nueva cubicación desde TakeoffListComponent');
  }
  editar(id: string) {
    console.log(`Editando cubicación ${id} desde TakeoffListComponent`);
  }

  eliminar(id: string) {
    console.log(`Eliminando cubicación ${id} desde TakeoffListComponent`);
  }
  
  // Acción para ver detalle productos
  verDetalleProductos(id: string) {
    // Navega a la lista de productos de cubicaciones pasando el id
    this.router.navigate(['/cubicaciones/productos', id]);
  }
  
  // Métodos para DataTable
  onRowClick(item: any): void {
    console.log('Fila seleccionada:', item);
  }
  
  onSortChange(sortConfig: SortConfig): void {
    this.sortConfig = sortConfig;
    this.sortColumn = sortConfig.column;
    this.sortDirection = sortConfig.direction;
    this.applySort();
  }
  
  applySort(): void {
    // La ordenación se hace dentro del DataTable
  }
  
  onColumnReorder(columns: TableColumn[]): void {
    // Actualizar columnas después de reordenar
    this.columns = columns;
    this.columnOrder = columns.map(col => col.key);
  }

  sortTable(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    
    const pinnedItems = this.cubicaciones.filter(item => this.pinnedItems.has(item.id));
    const unpinnedItems = this.cubicaciones.filter(item => !this.pinnedItems.has(item.id));
    
    const sortFn = (a: any, b: any) => {
      const valA = column === 'monto' ? 
        parseFloat(a[column].replace(/[^0-9.-]+/g, '')) : 
        a[column];
      const valB = column === 'monto' ? 
        parseFloat(b[column].replace(/[^0-9.-]+/g, '')) : 
        b[column];

      let comparison = 0;
      if (valA > valB) {
        comparison = 1;
      } else if (valA < valB) {
        comparison = -1;
      }
      return this.sortDirection === 'asc' ? comparison : comparison * -1;
    };

    pinnedItems.sort(sortFn);
    unpinnedItems.sort(sortFn);
    
    this.cubicaciones = [...pinnedItems, ...unpinnedItems];
  }

  getMaxDisplayed(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.totalItems);
  }

  changePage(page: number) {
    if (page >= 1 && page <= this.getTotalPages()) {
      this.currentPage = page;
    }
  }

  getTotalPages(): number {
    return Math.ceil(this.totalItems / this.itemsPerPage);
  }

  // Método para manejar el cambio de tamaño de página desde el componente TablePagination
  onPageSizeChange(size: number): void {
    this.itemsPerPage = size;
    this.paginationConfig.itemsPerPage = size;
    
    // Ajustar la página currentPage si es necesario
    const totalPages = this.getTotalPages();
    if (this.currentPage > totalPages) {
      this.currentPage = totalPages || 1;
      this.paginationConfig.currentPage = this.currentPage;
    }
  }

  getPageNumbers(): number[] {
    const totalPages = this.getTotalPages();
    const pages: number[] = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }
  onDragStart(event: DragEvent, columnId: string) {
    if (columnId === 'id' || columnId === 'actions') return;
    this.draggedColumn = columnId;
    if (event.dataTransfer) {
      event.dataTransfer.setData('text/plain', columnId);
    }
  }

  onDragOver(event: DragEvent, columnId: string) {
    if (columnId === 'id' || columnId === 'actions' || !this.draggedColumn) return;
    event.preventDefault();
    const th = (event.target as HTMLElement).closest('th');
    if (th) {
      th.classList.add('drag-over');
    }
  }

  onDragLeave(event: DragEvent) {
    const th = (event.target as HTMLElement).closest('th');
    if (th) {
      th.classList.remove('drag-over');
    }
  }
  onDrop(event: DragEvent, targetColumnId: string) {
    event.preventDefault();
    if (targetColumnId === 'id' || targetColumnId === 'actions' || !this.draggedColumn) return;

    const th = (event.target as HTMLElement).closest('th');
    if (th) {
      th.classList.remove('drag-over');
    }

    const fromIndex = this.columnOrder.indexOf(this.draggedColumn);
    const toIndex = this.columnOrder.indexOf(targetColumnId);

    if (fromIndex !== -1 && toIndex !== -1) {
      this.columnOrder = Array.from(this.columnOrder);
      this.columnOrder.splice(fromIndex, 1);
      this.columnOrder.splice(toIndex, 0, this.draggedColumn);
    }

    this.draggedColumn = null;
  }

  onDragEnd() {
    this.draggedColumn = null;
    document.querySelectorAll('th.drag-over').forEach(th => {
      th.classList.remove('drag-over');
    });
  }

  toggleFilterMenu() {
    this.showFilterMenu = !this.showFilterMenu;
  }

  toggleColumnMenu() {
    // Al abrir el diálogo, inicializar el estado temporal con las columnas actualmente visibles
    if (!this.showColumnMenu) {
      this.tempColumnState = new Set(this.columnOrder);
    }
    this.showColumnMenu = !this.showColumnMenu;
  }

  closeColumnMenu(): void {
    this.showColumnMenu = false;
  }

  // Métodos para el componente ColumnDialog
  applyColumnChanges(newColumns?: TableColumn[]): void {
    if (newColumns) {
      // Actualizar columnas y orden de columnas según la selección del diálogo
      this.columns = newColumns;
      this.columnOrder = newColumns.filter(col => col.visible !== false).map(col => col.key);
    }
    this.closeColumnMenu();
  }
  cancelColumnChanges(): void {
    // Restaurar columnas por defecto
    this.resetColumns();
    this.closeColumnMenu();
  }

  isColumnSelected(columnId: string): boolean {
    // Para el diálogo, usamos el estado temporal
    return this.tempColumnState.has(columnId);
  }

  toggleColumnSelection(columnId: string): void {
    if (columnId === 'id') return; // La columna ID siempre debe estar visible
    
    if (this.tempColumnState.has(columnId)) {
      this.tempColumnState.delete(columnId);
    } else {
      this.tempColumnState.add(columnId);
    }
  }

  isPinned(id: string): boolean {
    return this.pinnedItems.has(id);
  }

  togglePin(id: string) {
    const updated = new Set(this.pinnedItems);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.add(id);
    }
    this.pinnedItems = updated;
    this.reorderCubicaciones();
  }

  private reorderCubicaciones() {
    const pinned = this.originalCubicaciones.filter(item => this.pinnedItems.has(item.id));
    const unpinned = this.originalCubicaciones.filter(item => !this.pinnedItems.has(item.id));
    this.cubicaciones = [...pinned, ...unpinned];
  }

  isColumnVisible(columnId: string): boolean {
    return this.columnOrder.includes(columnId);
  }

  toggleColumn(columnId: string) {
    if (columnId === 'id') return;

    const index = this.columnOrder.indexOf(columnId);
    if (index === -1) {
      this.columnOrder.push(columnId);
    } else {
      this.columnOrder.splice(index, 1);
    }
  }

  resetColumns() {
    this.columnOrder = [...this.defaultColumnOrder];
  }
}
