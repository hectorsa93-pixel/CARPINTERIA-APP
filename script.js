// Obtener jsPDF desde el objeto window (cargado en index.html)
const { jsPDF } = window.jspdf;

// --- Configuración Global y Variables ---
let monedaActual = 'USD';
const TASA_CAMBIO = 18.0; 
let registros = []; 
const FACTOR_HORA_EXTRA = 1.5;
const HORAS_MAX_NORMALES = 40;
let lugares = new Set(["Taller Principal", "Proyecto Cliente A"]);

// Funciones Auxiliares (getWeekNumber, calcularPago, etc.)
function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return d.getUTCFullYear() + '-' + (weekNo < 10 ? '0' : '') + weekNo;
}

function calcularPago(pagoHora, horasNormales, horasExtra) {
    const ph = parseFloat(pagoHora);
    const hn = parseFloat(horasNormales);
    const he = parseFloat(horasExtra);
    
    const pagoNormal = ph * hn;
    const pagoHoraExtra = ph * FACTOR_HORA_EXTRA;
    const pagoExtraTotal = pagoHoraExtra * he;
    
    return pagoNormal + pagoExtraTotal;
}

// ----------------------------------------------------------------
// FUNCIÓN PRINCIPAL DE INICIALIZACIÓN DE LA APLICACIÓN
// ----------------------------------------------------------------
function iniciarApp() {
    // 1. Obtener elementos de la App
    const form = document.getElementById('registro-form');
    const tablaBody = document.getElementById('registros-body');
    const selectLugar = document.getElementById('lugarTrabajo');
    const btnCambiarMoneda = document.getElementById('btnCambiarMoneda');
    const btnSubmit = document.getElementById('btnSubmit');
    const registroIndexInput = document.getElementById('registroIndex');
    const filtroMes = document.getElementById('filtroMes');
    const filtroBusqueda = document.getElementById('filtroBusqueda'); 
    const btnAgregarLugar = document.getElementById('btnAgregarLugar'); 
    const exportTypeSelect = document.getElementById('exportType');
    const dynamicExportFields = document.getElementById('dynamicExportFields');
    const btnExportarPDF = document.getElementById('btnExportarPDF');

    // 2. Cargar datos
    const storedRegistros = localStorage.getItem('carpinteriaRegistros');
    if (storedRegistros) {
        registros = JSON.parse(storedRegistros);
    }
    const storedLugares = localStorage.getItem('carpinteriaLugares');
    if (storedLugares) {
        lugares = new Set(JSON.parse(storedLugares));
    }


    // --- Funciones de Moneda, Lugares, Renderizado y Persistencia ---
    
    function actualizarInterfazMoneda() {
        const simbolo = (monedaActual === 'USD') ? 'USD $' : 'MXN $';
        document.getElementById('monedaActual').textContent = monedaActual;
        document.getElementById('simboloMonedaPago').textContent = simbolo;
        btnCambiarMoneda.textContent = `Cambiar a ${monedaActual === 'USD' ? 'MXN' : 'USD'}`;
        renderizarTabla();
    }
    
    function actualizarSelectLugares() {
        selectLugar.innerHTML = '<option value="" disabled selected>Seleccione un lugar</option>';
        lugares.forEach(lugar => {
            const opcion = document.createElement('option');
            opcion.value = lugar;
            opcion.textContent = lugar;
            selectLugar.appendChild(opcion);
        });
        localStorage.setItem('carpinteriaLugares', JSON.stringify(Array.from(lugares)));
    }

    function guardarRegistros() {
        localStorage.setItem('carpinteriaRegistros', JSON.stringify(registros));
    }

    function renderizarTabla() {
        tablaBody.innerHTML = '';
        const mesFiltro = filtroMes.value;
        const textoBusqueda = filtroBusqueda.value.toLowerCase(); 

        const registrosFiltrados = registros.filter(reg => {
            const filtroPorMes = mesFiltro ? reg.fecha.startsWith(mesFiltro) : true;
            const filtroPorTexto = textoBusqueda ? 
                reg.nombre.toLowerCase().includes(textoBusqueda) || 
                reg.lugarTrabajo.toLowerCase().includes(textoBusqueda) 
                : true;

            return filtroPorMes && filtroPorTexto;
        });

        registrosFiltrados.forEach((registro) => {
            let pagoHoraDisplay = parseFloat(registro.pagoHoraBase);
            let simbolo = 'USD $'; 

            if (monedaActual === 'MXN') {
                pagoHoraDisplay = pagoHoraDisplay * TASA_CAMBIO;
                simbolo = 'MXN $';
            }

            const pagoTotal = calcularPago(pagoHoraDisplay, registro.horasNormales, registro.horasExtra);
            
            const newRow = tablaBody.insertRow();
            newRow.setAttribute('data-index', registros.indexOf(registro)); 

            newRow.insertCell().textContent = registro.nombre;
            newRow.insertCell().textContent = registro.fecha; 
            newRow.insertCell().textContent = registro.horasNormales;
            newRow.insertCell().textContent = registro.horasExtra;
            newRow.insertCell().textContent = `${simbolo}${pagoHoraDisplay.toFixed(2)}`;
            newRow.insertCell().textContent = registro.lugarTrabajo;
            newRow.insertCell().textContent = `${simbolo}${pagoTotal.toFixed(2)}`;
            
            const cellAcciones = newRow.insertCell();
            
            const btnEditar = document.createElement('button');
            btnEditar.textContent = '✏️ Editar';
            btnEditar.className = 'btn-editar';
            btnEditar.onclick = () => cargarParaEdicion(registros.indexOf(registro));
            cellAcciones.appendChild(btnEditar);

            const btnEliminar = document.createElement('button');
            btnEliminar.textContent = '🗑️ Eliminar';
            btnEliminar.className = 'btn-eliminar';
            btnEliminar.onclick = () => eliminarRegistro(registros.indexOf(registro));
            cellAcciones.appendChild(btnEliminar);
        });
    }

    // --- Funciones de Edición y Eliminación ---
    function cargarParaEdicion(index) {
        const registro = registros[index];
        const pagoHoraInput = document.getElementById('pagoHora');

        document.getElementById('nombre').value = registro.nombre;
        document.getElementById('horasNormales').value = registro.horasNormales;
        document.getElementById('horasExtra').value = registro.horasExtra;
        selectLugar.value = registro.lugarTrabajo; 
        
        let pagoHoraDisplay = parseFloat(registro.pagoHoraBase);
        if (monedaActual === 'MXN') {
            pagoHoraDisplay *= TASA_CAMBIO;
        }
        pagoHoraInput.value = pagoHoraDisplay.toFixed(2);

        registroIndexInput.value = index;
        btnSubmit.textContent = 'Guardar Cambios';
    }

    function eliminarRegistro(index) {
        if (confirm(`¿Estás seguro de que deseas eliminar el registro de ${registros[index].nombre} del ${registros[index].fecha}?`)) {
            registros.splice(index, 1);
            guardarRegistros();
            renderizarTabla();
            
            if (parseInt(registroIndexInput.value) === index) {
                form.reset();
                registroIndexInput.value = -1;
                btnSubmit.textContent = 'Calcular y Registrar Pago';
            }
        }
    }

    // --- Lógica y Funciones de Exportación a PDF ---
    
    function actualizarCamposExportacion() {
        const type = exportTypeSelect.value;
        dynamicExportFields.innerHTML = '';
        let labelText = '';
        let inputHtml = '';

        if (type === 'month') {
            labelText = 'Seleccionar Mes:';
            inputHtml = `<input type="month" id="exportValue" value="${new Date().toISOString().substring(0, 7)}">`;
        } else if (type === 'person') {
            labelText = 'Seleccionar Trabajador:';
            const nombresUnicos = [...new Set(registros.map(r => r.nombre))].sort();
            inputHtml = `<select id="exportValue"><option value="">Todos (Acumulado)</option>${nombresUnicos.map(n => `<option value="${n}">${n}</option>`).join('')}</select>`;
        } else if (type === 'date') {
            labelText = 'Seleccionar Fecha:';
            inputHtml = `<input type="date" id="exportValue">`;
        } else if (type === 'week') {
            labelText = 'Seleccionar Semana (Año-Semana):';
            inputHtml = `<input type="week" id="exportValue">`;
        }

        if (labelText) {
            dynamicExportFields.innerHTML = `
                <label for="exportValue">${labelText}</label>
                ${inputHtml}
            `;
        }
    }
    
    function exportarAPDF() {
        const exportType = exportTypeSelect.value;
        const exportValueElement = document.getElementById('exportValue');
        let exportValue = exportValueElement ? exportValueElement.value : '';

        if (!exportValue && exportType !== 'person') {
            alert(`Por favor, selecciona un valor para la exportación por ${exportType}.`);
            return;
        }

        let registrosAExportar = [];
        let titulo = '';

        if (exportType === 'month') {
            registrosAExportar = registros.filter(reg => reg.fecha.startsWith(exportValue));
            titulo = `Historial Mensual: ${exportValue}`;
        } else if (exportType === 'date') {
            registrosAExportar = registros.filter(reg => reg.fecha === exportValue);
            titulo = `Historial por Fecha: ${exportValue}`;
        } else if (exportType === 'week') {
            registrosAExportar = registros.filter(reg => {
                const date = new Date(reg.fecha);
                return getWeekNumber(date) === exportValue;
            });
            titulo = `Historial Semanal: ${exportValue}`;
        } else if (exportType === 'person') {
            registrosAExportar = exportValue ? registros.filter(reg => reg.nombre === exportValue) : registros;
            titulo = exportValue ? `Historial Acumulado de: ${exportValue}` : `Historial Acumulado de TODOS los Trabajadores`;
        }

        if (registrosAExportar.length === 0) {
            alert("No hay registros para los criterios seleccionados.");
            return;
        }

        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text(titulo, 10, 10);
        
        let pagoTotalAcumuladoUSD = 0;

        const tableColumn = ["Nombre", "Fecha", "H. Normales", "H. Extras", "Pago x H (USD)", "Pago x H (MXN)", "Pago Total (USD)"];
        const tableRows = registrosAExportar.map(reg => {
            const pagoH_USD = parseFloat(reg.pagoHoraBase);
            const pagoH_MXN = pagoH_USD * TASA_CAMBIO;
            const pagoTotalUSD = calcularPago(pagoH_USD, reg.horasNormales, reg.horasExtra);
            
            pagoTotalAcumuladoUSD += pagoTotalUSD;

            return [
                reg.nombre,
                reg.fecha,
                reg.horasNormales,
                reg.horasExtra,
                pagoH_USD.toFixed(2),
                pagoH_MXN.toFixed(2),
                pagoTotalUSD.toFixed(2)
            ];
        });

        doc.autoTable(tableColumn, tableRows, { startY: 25 });
        const finalY = doc.autoTable.previous.finalY + 10;
        
        const pagoTotalAcumuladoMXN = pagoTotalAcumuladoUSD * TASA_CAMBIO;

        doc.setFontSize(12);
        doc.text(`Total Acumulado USD: $${pagoTotalAcumuladoUSD.toFixed(2)}`, 10, finalY);
        doc.text(`Total Acumulado MXN: $${pagoTotalAcumuladoMXN.toFixed(2)}`, 10, finalY + 7);

        doc.save(`Historial_Carpinteria_${exportType}_${exportValue || 'Todos'}.pdf`);
    }

    // --- Event Listeners ---

    btnCambiarMoneda.addEventListener('click', () => {
        monedaActual = (monedaActual === 'USD') ? 'MXN' : 'USD';
        actualizarInterfazMoneda();
    });

    exportTypeSelect.addEventListener('change', actualizarCamposExportacion);

    btnAgregarLugar.addEventListener('click', () => {
        const nuevoLugar = prompt("Ingrese el nombre del lugar de trabajo:");
        if (nuevoLugar && nuevoLugar.trim() !== "") {
            const trimmedLugar = nuevoLugar.trim();
            if (!lugares.has(trimmedLugar)) {
                lugares.add(trimmedLugar);
                actualizarSelectLugares();
            }
            selectLugar.value = trimmedLugar; 
        }
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const nombre = document.getElementById('nombre').value;
        let pagoHoraInput = parseFloat(document.getElementById('pagoHora').value);
        let horasNormales = parseFloat(document.getElementById('horasNormales').value);
        let horasExtra = parseFloat(document.getElementById('horasExtra').value);
        const lugarTrabajo = selectLugar.value;
        const index = parseInt(registroIndexInput.value);
        
        if (!lugares.has(lugarTrabajo) && lugarTrabajo !== "") {
            lugares.add(lugarTrabajo);
            actualizarSelectLugares();
        }
        
        let pagoHoraBaseUSD = pagoHoraInput; 
        if (monedaActual === 'MXN') {
            pagoHoraBaseUSD = pagoHoraInput / TASA_CAMBIO; 
        }

        if (horasNormales > HORAS_MAX_NORMALES) {
            const excesoHoras = horasNormales - HORAS_MAX_NORMALES;
            horasExtra += excesoHoras;
            horasNormales = HORAS_MAX_NORMALES;
        }
        
        const nuevoRegistro = {
            nombre,
            pagoHoraBase: pagoHoraBaseUSD.toFixed(2),
            horasNormales,
            horasExtra,
            lugarTrabajo,
            fecha: (index !== -1 && registros[index].fecha) ? registros[index].fecha : new Date().toISOString().substring(0, 10)
        };

        if (index === -1) {
            registros.push(nuevoRegistro);
        } else {
            registros[index] = nuevoRegistro;
            registroIndexInput.value = -1;
            btnSubmit.textContent = 'Calcular y Registrar Pago';
        }
        
        guardarRegistros();
        renderizarTabla();
        form.reset();
        selectLugar.value = ""; 
        
        actualizarCamposExportacion(); 
    });
    
    filtroMes.addEventListener('change', renderizarTabla);
    filtroBusqueda.addEventListener('input', renderizarTabla);
    btnExportarPDF.addEventListener('click', exportarAPDF);

    // 3. Inicializar componentes de la aplicación
    actualizarSelectLugares();
    actualizarInterfazMoneda();
    renderizarTabla();
    actualizarCamposExportacion();
    
    const today = new Date();
    const yearMonth = today.toISOString().substring(0, 7);
    filtroMes.value = yearMonth;
}

// ----------------------------------------------------------------
// CONTROL DE SPLASH SCREEN
// ----------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    const splashScreen = document.getElementById('splash-screen');
    const mainAppContainer = document.getElementById('main-app-container');
    const btnAccederApp = document.getElementById('btnAccederApp');

    // Inicialmente, solo se muestra el splash screen (ya está visible por defecto en HTML/CSS)
    // Ocultamos la aplicación principal (solo para asegurarnos)
    mainAppContainer.classList.add('hidden');
    
    // Al hacer clic, ocultamos el splash y mostramos la app
    btnAccederApp.addEventListener('click', () => {
        splashScreen.style.opacity = '0';
        
        setTimeout(() => {
            splashScreen.classList.add('hidden');
            mainAppContainer.classList.remove('hidden');
            // Inicializar toda la lógica de la aplicación solo después de que se accede
            iniciarApp(); 
        }, 500); // Pequeño retraso para la animación de opacidad
    });
});