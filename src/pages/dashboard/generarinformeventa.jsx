import React, { useState, useEffect } from "react";
import { Bar, Doughnut } from "react-chartjs-2";
import { Button, Input, Card, CardBody, Typography } from "@material-tailwind/react";
import axios from "../../utils/axiosConfig";
import Swal from "sweetalert2";
import * as XLSX from "xlsx"; // Importar la librería XLSX
import { Chart, registerables } from "chart.js";

Chart.register(...registerables);

export function GenerarInformeVenta({ onCancel }) {
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [fechaGeneracion, setFechaGeneracion] = useState(""); 
  const [productosMasVendidos, setProductosMasVendidos] = useState([]);
  const [clientesMasCompraron, setClientesMasCompraron] = useState([]);
  const [numeroVentas, setNumeroVentas] = useState(0); 
  const [ventas, setVentas] = useState([]);
  const [productos, setProductos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [informeGenerado, setInformeGenerado] = useState(false);

  useEffect(() => {
    fetchVentas();
    fetchProductos();
    fetchClientes();
  }, []);

  const fetchVentas = async () => {
    try {
      const response = await axios.get("http://localhost:3000/api/ventas");
      setVentas(response.data);
    } catch (error) {
      console.error("Error fetching ventas:", error);
    }
  };

  const fetchProductos = async () => {
    try {
      const response = await axios.get("http://localhost:3000/api/productos");
      setProductos(response.data);
    } catch (error) {
      console.error("Error fetching productos:", error);
    }
  };

  const fetchClientes = async () => {
    try {
      const response = await axios.get("http://localhost:3000/api/clientes");
      setClientes(response.data);
    } catch (error) {
      console.error("Error fetching clientes:", error);
    }
  };

  const handleGenerarInforme = () => {
    if (!fechaInicio || !fechaFin) {
      Swal.fire({
        icon: "error",
        title: "Fechas inválidas",
        text: "Por favor, selecciona las fechas de inicio y fin.",
      });
      return;
    }

    const ventasFiltradas = ventas.filter((venta) => {
      const fechaVenta = new Date(venta.fecha_venta);
      return fechaVenta >= new Date(fechaInicio) && fechaVenta <= new Date(fechaFin);
    });

    if (ventasFiltradas.length === 0) {
      Swal.fire({
        icon: "error",
        title: "No se encontraron ventas",
        text: "No hay ventas dentro del rango de fechas seleccionado.",
      });
      return;
    }

    const productosVendidos = {};
    const clientesCompraron = {};

    ventasFiltradas.forEach((venta) => {
      if (Array.isArray(venta.detalles)) {
        venta.detalles.forEach((detalle) => {
          if (!productosVendidos[detalle.id_producto]) {
            const producto = productos.find((p) => p.id_producto === detalle.id_producto);
            productosVendidos[detalle.id_producto] = {
              id_producto: detalle.id_producto,
              cantidad: 0,
              nombre: producto ? producto.nombre : "Desconocido",
            };
          }
          productosVendidos[detalle.id_producto].cantidad += detalle.cantidad || 0;
        });
      }

      if (!clientesCompraron[venta.id_cliente]) {
        const cliente = clientes.find((c) => c.id_cliente === venta.id_cliente);
        clientesCompraron[venta.id_cliente] = {
          id_cliente: venta.id_cliente,
          nombre: cliente ? cliente.nombre : "Desconocido",
          totalComprado: 0,
        };
      }
      clientesCompraron[venta.id_cliente].totalComprado += parseFloat(venta.total) || 0;
    });

    const productosMasVendidos = Object.values(productosVendidos).sort((a, b) => b.cantidad - a.cantidad);
    const clientesMasCompraron = Object.values(clientesCompraron).sort((a, b) => b.totalComprado - a.totalComprado);

    setProductosMasVendidos(productosMasVendidos);
    setClientesMasCompraron(clientesMasCompraron);

    const fechaActual = new Date().toLocaleDateString();
    setFechaGeneracion(fechaActual);
    setNumeroVentas(ventasFiltradas.length);
    setInformeGenerado(true);

    Swal.fire({
      icon: "success",
      title: "Informe generado con éxito",
      showConfirmButton: false,
      timer: 2000,
    });
  };

  const handleDescargarInforme = () => {
    // Crear datos para el archivo Excel
    const datosExcel = [
      { encabezado: "Informe de Ventas", valor: "" },
      { encabezado: "Fecha de Generación", valor: fechaGeneracion },
      { encabezado: "Periodo", valor: `${fechaInicio} - ${fechaFin}` },
      { encabezado: "Número de Ventas Realizadas", valor: numeroVentas },
      {},
      { encabezado: "Productos más vendidos", valor: "" },
      ...productosMasVendidos.map(producto => ({
        encabezado: producto.nombre,
        valor: producto.cantidad,
      })),
      {},
      { encabezado: "Clientes que más compraron", valor: "" },
      ...clientesMasCompraron.map(cliente => ({
        encabezado: cliente.nombre,
        valor: `$${cliente.totalComprado.toFixed(2)}`,
      })),
    ];

    // Crear hoja de trabajo (worksheet)
    const ws = XLSX.utils.json_to_sheet(datosExcel, { header: ["encabezado", "valor"] });

    // Crear libro de trabajo (workbook)
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Informe de Ventas");

    // Descargar el archivo Excel
    XLSX.writeFile(wb, `informe_ventas_${fechaGeneracion}.xlsx`);
  };

  const productosLabels = productosMasVendidos.map(producto => producto.nombre);
  const productosData = productosMasVendidos.map(producto => producto.cantidad);

  const productosChartData = {
    labels: productosLabels,
    datasets: [
      {
        label: 'Cantidad Vendida',
        data: productosData,
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
    ],
  };

  const clientesLabels = clientesMasCompraron.map(cliente => cliente.nombre);
  const clientesData = clientesMasCompraron.map(cliente => cliente.totalComprado);

  const clientesChartData = {
    labels: clientesLabels,
    datasets: [
      {
        label: 'Total Comprado',
        data: clientesData,
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(153, 102, 255, 0.6)',
          'rgba(255, 159, 64, 0.6)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    maintainAspectRatio: false,
    responsive: true,
    aspectRatio: 1.5,
    scales: {
      y: {
        beginAtZero: true,
        max: 2000,
        ticks: {
          stepSize: 200,
        },
      },
    },
  };

  return (
    <div className="mt-6">
      <Card>
        <CardBody>
          <Typography variant="h6" className="mb-4">Generar Informe de Ventas</Typography>
          <div className="flex flex-col gap-4 mb-6">
            <Input
              type="date"
              label="Fecha Inicio"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
            />
            <Input
              type="date"
              label="Fecha Fin"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
            />
          </div>
          <div className="flex gap-4">
            <Button color="blue" onClick={handleGenerarInforme}>Generar Informe</Button>
            <Button color="red" onClick={onCancel}>Cancelar</Button>
          </div>

          {informeGenerado && (
            <>
              <Typography variant="h6" className="mt-6">Fecha de generación del informe: {fechaGeneracion}</Typography>
              <Typography variant="h6" className="mt-6">Periodo del informe: {fechaInicio} - {fechaFin}</Typography>
              <Typography variant="h6" className="mt-6">Número de ventas realizadas en el periodo: {numeroVentas}</Typography>

              <Typography variant="h6" className="mt-6">Productos más vendidos:</Typography>
              <div style={{ height: '300px' }}>
                <Bar data={productosChartData} options={chartOptions} />
              </div>

              <Typography variant="h6" className="mt-6">Clientes que más compraron:</Typography>
              <div style={{ height: '300px' }}>
                <Doughnut data={clientesChartData} options={chartOptions} />
              </div>

              <Button className="mt-6" onClick={handleDescargarInforme}>Descargar Informe</Button>
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
