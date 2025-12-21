'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  DatePicker,
  Select,
  Statistic,
  Row,
  Col,
  Tabs,
  Progress,
  Space,
  Tag,
  Spin,
  Empty,
} from 'antd';
import {
  DownloadOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  DollarOutlined,
  ShoppingCartOutlined,
  InboxOutlined,
  UserOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const { RangePicker } = DatePicker;

const COLORS = ['#ed751a', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState([dayjs().subtract(30, 'day'), dayjs()]);
  const [reportType, setReportType] = useState('sales');
  const [loading, setLoading] = useState(false);

  // Data states
  const [salesData, setSalesData] = useState(null);
  const [inventoryData, setInventoryData] = useState(null);
  const [supplierData, setSupplierData] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [profitLossData, setProfitLossData] = useState(null);

  const getDateParams = () => {
    return {
      from_date: dateRange[0]?.format('YYYY-MM-DD'),
      to_date: dateRange[1]?.format('YYYY-MM-DD'),
    };
  };

  const fetchSalesData = async () => {
    try {
      const params = { ...getDateParams(), group_by: 'day' };
      const [salesRes, categoryRes, topProductsRes, profitRes] = await Promise.all([
        api.get('/admin/dashboard/reports/sales', { params }),
        api.get('/admin/dashboard/reports/category-performance', { params }),
        api.get('/admin/dashboard/reports/top-products', { params: { ...params, limit: 10 } }),
        api.get('/admin/dashboard/reports/profit-loss', { params }),
      ]);

      setSalesData(salesRes.data.data);
      setCategoryData(categoryRes.data.data || []);
      setTopProducts(topProductsRes.data.data || []);
      setProfitLossData(profitRes.data.data);
    } catch (error) {
      console.error('Error fetching sales data:', error);
      toast.error('Failed to load sales report');
    }
  };

  const fetchInventoryData = async () => {
    try {
      const response = await api.get('/admin/dashboard/reports/inventory');
      setInventoryData(response.data.data);
    } catch (error) {
      console.error('Error fetching inventory data:', error);
      toast.error('Failed to load inventory report');
    }
  };

  const fetchSupplierData = async () => {
    try {
      const params = getDateParams();
      const response = await api.get('/admin/dashboard/reports/suppliers', { params });
      setSupplierData(response.data.data);
    } catch (error) {
      console.error('Error fetching supplier data:', error);
      toast.error('Failed to load supplier report');
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchSalesData(),
        fetchInventoryData(),
        fetchSupplierData(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDateChange = (dates) => {
    setDateRange(dates);
  };

  const handleRefresh = () => {
    fetchData();
  };

  // Export to Excel
  const exportToExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      const dateStr = `${dateRange[0]?.format('YYYY-MM-DD')}_to_${dateRange[1]?.format('YYYY-MM-DD')}`;

      if (reportType === 'sales') {
        // Sales data sheet
        if (salesData?.data?.length > 0) {
          const salesSheet = XLSX.utils.json_to_sheet(salesData.data.map(item => ({
            'Period': item.period,
            'Orders': item.orders,
            'Revenue (₹)': parseFloat(item.revenue || 0).toFixed(2),
          })));
          XLSX.utils.book_append_sheet(wb, salesSheet, 'Sales Data');
        }

        // Top products sheet
        if (topProducts?.length > 0) {
          const productsSheet = XLSX.utils.json_to_sheet(topProducts.map(item => ({
            'Product': item.product_name,
            'Variant': item.variant_name,
            'SKU': item.sku,
            'Quantity Sold': parseFloat(item.total_qty || 0),
            'Revenue (₹)': parseFloat(item.total_revenue || 0).toFixed(2),
          })));
          XLSX.utils.book_append_sheet(wb, productsSheet, 'Top Products');
        }

        // Category performance sheet
        if (categoryData?.length > 0) {
          const categorySheet = XLSX.utils.json_to_sheet(categoryData.map(item => ({
            'Category': item.name || 'Uncategorized',
            'Orders': item.orders,
            'Units Sold': parseFloat(item.units_sold || 0),
            'Revenue (₹)': parseFloat(item.revenue || 0).toFixed(2),
          })));
          XLSX.utils.book_append_sheet(wb, categorySheet, 'Category Performance');
        }
      } else if (reportType === 'inventory') {
        // Inventory by category
        if (inventoryData?.by_category?.length > 0) {
          const inventorySheet = XLSX.utils.json_to_sheet(inventoryData.by_category.map(item => ({
            'Category': item.name || 'Uncategorized',
            'Products': item.total_products,
            'Variants': item.total_variants,
            'Total Units': parseFloat(item.total_units || 0),
            'Stock Value (₹)': parseFloat(item.stock_value || 0).toFixed(2),
            'Low Stock': item.low_stock,
            'Out of Stock': item.out_of_stock,
          })));
          XLSX.utils.book_append_sheet(wb, inventorySheet, 'Inventory by Category');
        }

        // Stock movements
        if (inventoryData?.movements?.length > 0) {
          const movementsSheet = XLSX.utils.json_to_sheet(inventoryData.movements.map(item => ({
            'Category': item.category || 'Uncategorized',
            'Received': parseFloat(item.received || 0),
            'Sold': parseFloat(item.sold || 0),
            'Adjusted': parseFloat(item.adjusted || 0),
          })));
          XLSX.utils.book_append_sheet(wb, movementsSheet, 'Stock Movements');
        }
      } else if (reportType === 'supplier') {
        // Supplier performance
        if (supplierData?.suppliers?.length > 0) {
          const supplierSheet = XLSX.utils.json_to_sheet(supplierData.suppliers.map(item => ({
            'Supplier': item.name,
            'Total Orders': item.total_orders,
            'Total Value (₹)': parseFloat(item.total_value || 0).toFixed(2),
            'Completed': item.completed_orders,
            'Pending': item.pending_orders,
          })));
          XLSX.utils.book_append_sheet(wb, supplierSheet, 'Supplier Performance');
        }

        // PO Trend
        if (supplierData?.po_trend?.length > 0) {
          const trendSheet = XLSX.utils.json_to_sheet(supplierData.po_trend.map(item => ({
            'Month': item.month,
            'Orders': item.orders,
            'Value (₹)': parseFloat(item.value || 0).toFixed(2),
          })));
          XLSX.utils.book_append_sheet(wb, trendSheet, 'PO Trend');
        }
      } else if (reportType === 'profit') {
        // Profit/Loss summary
        if (profitLossData) {
          const profitSheet = XLSX.utils.json_to_sheet([{
            'Revenue (₹)': parseFloat(profitLossData.revenue || 0).toFixed(2),
            'Cost of Goods (₹)': parseFloat(profitLossData.cogs || 0).toFixed(2),
            'Gross Profit (₹)': parseFloat(profitLossData.gross_profit || 0).toFixed(2),
            'Profit Margin (%)': profitLossData.profit_margin,
          }]);
          XLSX.utils.book_append_sheet(wb, profitSheet, 'Profit & Loss');
        }
      }

      // Download file
      const reportName = reportType.charAt(0).toUpperCase() + reportType.slice(1);
      XLSX.writeFile(wb, `${reportName}_Report_${dateStr}.xlsx`);
      toast.success('Excel exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export Excel');
    }
  };

  // Export to PDF
  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      const dateStr = `${dateRange[0]?.format('YYYY-MM-DD')} to ${dateRange[1]?.format('YYYY-MM-DD')}`;
      const reportName = reportType.charAt(0).toUpperCase() + reportType.slice(1);

      // Title
      doc.setFontSize(18);
      doc.text(`${reportName} Report`, 14, 22);
      doc.setFontSize(11);
      doc.text(`Period: ${dateStr}`, 14, 30);
      doc.text(`Generated: ${dayjs().format('YYYY-MM-DD HH:mm')}`, 14, 36);

      let yPos = 45;

      if (reportType === 'sales') {
        // Sales summary
        if (salesData?.totals) {
          doc.setFontSize(14);
          doc.text('Sales Summary', 14, yPos);
          yPos += 8;
          doc.setFontSize(10);
          doc.text(`Total Revenue: ₹${parseFloat(salesData.totals.total_revenue || 0).toLocaleString()}`, 14, yPos);
          yPos += 6;
          doc.text(`Total Orders: ${salesData.totals.total_orders || 0}`, 14, yPos);
          yPos += 6;
          if (profitLossData) {
            doc.text(`Gross Profit: ₹${parseFloat(profitLossData.gross_profit || 0).toLocaleString()}`, 14, yPos);
            yPos += 6;
            doc.text(`Profit Margin: ${profitLossData.profit_margin || 0}%`, 14, yPos);
          }
          yPos += 12;
        }

        // Top products table
        if (topProducts?.length > 0) {
          doc.setFontSize(14);
          doc.text('Top Products', 14, yPos);
          yPos += 4;
          doc.autoTable({
            startY: yPos,
            head: [['Product', 'Variant', 'Qty Sold', 'Revenue (₹)']],
            body: topProducts.slice(0, 10).map(item => [
              item.product_name,
              item.variant_name,
              parseFloat(item.total_qty || 0),
              parseFloat(item.total_revenue || 0).toFixed(2),
            ]),
            theme: 'striped',
            headStyles: { fillColor: [8, 205, 87] },
          });
          yPos = doc.lastAutoTable.finalY + 10;
        }

        // Category performance table
        if (categoryData?.length > 0 && yPos < 250) {
          doc.setFontSize(14);
          doc.text('Category Performance', 14, yPos);
          yPos += 4;
          doc.autoTable({
            startY: yPos,
            head: [['Category', 'Orders', 'Units Sold', 'Revenue (₹)']],
            body: categoryData.map(item => [
              item.name || 'Uncategorized',
              item.orders,
              parseFloat(item.units_sold || 0),
              parseFloat(item.revenue || 0).toFixed(2),
            ]),
            theme: 'striped',
            headStyles: { fillColor: [8, 205, 87] },
          });
        }
      } else if (reportType === 'inventory') {
        // Inventory summary
        if (inventoryData?.summary) {
          doc.setFontSize(14);
          doc.text('Inventory Summary', 14, yPos);
          yPos += 8;
          doc.setFontSize(10);
          doc.text(`Total Products: ${inventoryData.summary.total_products || 0}`, 14, yPos);
          yPos += 6;
          doc.text(`Total Stock Value: ₹${parseFloat(inventoryData.summary.total_stock_value || 0).toLocaleString()}`, 14, yPos);
          yPos += 6;
          doc.text(`Low Stock Items: ${inventoryData.summary.low_stock_count || 0}`, 14, yPos);
          yPos += 6;
          doc.text(`Out of Stock: ${inventoryData.summary.out_of_stock_count || 0}`, 14, yPos);
          yPos += 12;
        }

        // Inventory by category
        if (inventoryData?.by_category?.length > 0) {
          doc.setFontSize(14);
          doc.text('Inventory by Category', 14, yPos);
          yPos += 4;
          doc.autoTable({
            startY: yPos,
            head: [['Category', 'Products', 'Variants', 'Stock Value (₹)', 'Low Stock']],
            body: inventoryData.by_category.map(item => [
              item.name || 'Uncategorized',
              item.total_products,
              item.total_variants,
              parseFloat(item.stock_value || 0).toFixed(2),
              item.low_stock,
            ]),
            theme: 'striped',
            headStyles: { fillColor: [8, 205, 87] },
          });
        }
      } else if (reportType === 'supplier') {
        // Supplier summary
        if (supplierData?.summary) {
          doc.setFontSize(14);
          doc.text('Supplier Summary', 14, yPos);
          yPos += 8;
          doc.setFontSize(10);
          doc.text(`Total Suppliers: ${supplierData.summary.total_suppliers || 0}`, 14, yPos);
          yPos += 6;
          doc.text(`Active Suppliers: ${supplierData.summary.active_suppliers || 0}`, 14, yPos);
          yPos += 12;
        }

        // Supplier performance
        if (supplierData?.suppliers?.length > 0) {
          doc.setFontSize(14);
          doc.text('Supplier Performance', 14, yPos);
          yPos += 4;
          doc.autoTable({
            startY: yPos,
            head: [['Supplier', 'Orders', 'Total Value (₹)', 'Completed', 'Pending']],
            body: supplierData.suppliers.map(item => [
              item.name,
              item.total_orders,
              parseFloat(item.total_value || 0).toFixed(2),
              item.completed_orders,
              item.pending_orders,
            ]),
            theme: 'striped',
            headStyles: { fillColor: [8, 205, 87] },
          });
        }
      } else if (reportType === 'profit') {
        // Profit/Loss summary
        if (profitLossData) {
          doc.setFontSize(14);
          doc.text('Profit & Loss Summary', 14, yPos);
          yPos += 8;
          doc.setFontSize(10);
          doc.text(`Gross Revenue: ₹${parseFloat(profitLossData.revenue || 0).toLocaleString()}`, 14, yPos);
          yPos += 6;
          doc.text(`Cost of Goods Sold: ₹${parseFloat(profitLossData.cogs || 0).toLocaleString()}`, 14, yPos);
          yPos += 6;
          doc.text(`Gross Profit: ₹${parseFloat(profitLossData.gross_profit || 0).toLocaleString()}`, 14, yPos);
          yPos += 6;
          doc.text(`Profit Margin: ${profitLossData.profit_margin || 0}%`, 14, yPos);
        }
      }

      // Download file
      const fileName = `${reportName}_Report_${dateRange[0]?.format('YYYY-MM-DD')}_to_${dateRange[1]?.format('YYYY-MM-DD')}.pdf`;
      doc.save(fileName);
      toast.success('PDF exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export PDF');
    }
  };

  const SalesReport = () => {
    if (!salesData) return <Empty description="No sales data available" />;

    const totals = salesData.totals || {};
    const chartData = (salesData.data || []).map(item => ({
      ...item,
      revenue: parseFloat(item.revenue) || 0,
      orders: parseInt(item.orders) || 0,
    }));

    // Calculate category percentages for pie chart
    const totalCategoryRevenue = categoryData.reduce((sum, cat) => sum + parseFloat(cat.revenue || 0), 0);
    const pieData = categoryData.map(cat => ({
      name: cat.name || 'Uncategorized',
      value: totalCategoryRevenue > 0 ? Math.round((parseFloat(cat.revenue || 0) / totalCategoryRevenue) * 100) : 0,
      revenue: parseFloat(cat.revenue || 0),
    }));

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <Row gutter={[16, 16]}>
          <Col xs={12} md={6}>
            <Card>
              <Statistic
                title="Total Revenue"
                value={parseFloat(totals.total_revenue) || 0}
                prefix="₹"
                valueStyle={{ color: '#ed751a' }}
              />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card>
              <Statistic
                title="Total Orders"
                value={parseInt(totals.total_orders) || 0}
                prefix={<ShoppingCartOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card>
              <Statistic
                title="Avg Order Value"
                value={totals.total_orders > 0 ? Math.round(parseFloat(totals.total_revenue) / parseInt(totals.total_orders)) : 0}
                prefix="₹"
              />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card>
              <Statistic
                title="Gross Profit"
                value={parseFloat(profitLossData?.gross_profit) || 0}
                prefix="₹"
                valueStyle={{ color: '#22c55e' }}
              />
              <div className="mt-2 text-sm text-gray-500">
                Margin: {profitLossData?.profit_margin || 0}%
              </div>
            </Card>
          </Col>
        </Row>

        {/* Sales Chart */}
        <Card title="Sales Trend">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip formatter={(value) => `₹${parseFloat(value).toLocaleString()}`} />
                <Legend />
                <Area type="monotone" dataKey="revenue" stroke="#ed751a" fill="#ed751a" fillOpacity={0.3} name="Revenue" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <Empty description="No chart data available" />
          )}
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category Distribution */}
          <Card title="Sales by Category">
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value}%`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {pieData.map((cat, idx) => (
                    <div key={cat.name} className="flex justify-between items-center">
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                        {cat.name}
                      </span>
                      <span className="font-medium">₹{cat.revenue.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <Empty description="No category data available" />
            )}
          </Card>

          {/* Top Products */}
          <Card title="Top Selling Products">
            {topProducts.length > 0 ? (
              <Table
                dataSource={topProducts}
                rowKey={(record) => `${record.id}-${record.sku}`}
                pagination={false}
                size="small"
                columns={[
                  {
                    title: 'Product',
                    key: 'product',
                    ellipsis: true,
                    render: (_, record) => (
                      <div>
                        <div className="font-medium">{record.product_name}</div>
                        <div className="text-xs text-gray-500">{record.variant_name}</div>
                      </div>
                    ),
                  },
                  {
                    title: 'Revenue',
                    dataIndex: 'total_revenue',
                    key: 'revenue',
                    render: (val) => `₹${parseFloat(val || 0).toLocaleString()}`,
                  },
                  {
                    title: 'Qty',
                    dataIndex: 'total_qty',
                    key: 'qty',
                    render: (val) => parseInt(val || 0),
                  },
                ]}
              />
            ) : (
              <Empty description="No product data available" />
            )}
          </Card>
        </div>
      </div>
    );
  };

  const InventoryReport = () => {
    if (!inventoryData) return <Empty description="No inventory data available" />;

    const summary = inventoryData.summary || {};
    const byCategory = inventoryData.by_category || [];
    const movements = inventoryData.movements || [];

    return (
      <div className="space-y-6">
        {/* Summary */}
        <Row gutter={[16, 16]}>
          <Col xs={12} md={6}>
            <Card>
              <Statistic
                title="Total Products"
                value={parseInt(summary.total_products) || 0}
                prefix={<InboxOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card>
              <Statistic
                title="Total Stock Value"
                value={parseFloat(summary.total_stock_value) || 0}
                prefix="₹"
                valueStyle={{ color: '#3b82f6' }}
              />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card>
              <Statistic
                title="Low Stock Items"
                value={parseInt(summary.low_stock_count) || 0}
                valueStyle={{ color: '#f59e0b' }}
              />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card>
              <Statistic
                title="Out of Stock"
                value={parseInt(summary.out_of_stock_count) || 0}
                valueStyle={{ color: '#ef4444' }}
              />
            </Card>
          </Col>
        </Row>

        {/* Category Breakdown */}
        <Card title="Inventory by Category">
          {byCategory.length > 0 ? (
            <Table
              dataSource={byCategory}
              rowKey="id"
              pagination={false}
              columns={[
                {
                  title: 'Category',
                  dataIndex: 'name',
                  key: 'name',
                  render: (name) => name || 'Uncategorized',
                },
                {
                  title: 'Products',
                  dataIndex: 'total_products',
                  key: 'products',
                },
                {
                  title: 'Variants',
                  dataIndex: 'total_variants',
                  key: 'variants',
                },
                {
                  title: 'Low Stock',
                  dataIndex: 'low_stock',
                  key: 'low_stock',
                  render: (val) => <Tag color="orange">{val}</Tag>,
                },
                {
                  title: 'Out of Stock',
                  dataIndex: 'out_of_stock',
                  key: 'out_of_stock',
                  render: (val) => <Tag color={val > 0 ? 'red' : 'green'}>{val}</Tag>,
                },
                {
                  title: 'Stock Value',
                  dataIndex: 'stock_value',
                  key: 'value',
                  render: (val) => `₹${parseFloat(val || 0).toLocaleString()}`,
                },
                {
                  title: 'Health',
                  key: 'health',
                  render: (_, record) => {
                    const total = parseInt(record.total_variants) || 1;
                    const issues = (parseInt(record.low_stock) || 0) + (parseInt(record.out_of_stock) || 0);
                    const healthPercent = 100 - ((issues / total) * 100);
                    return (
                      <Progress
                        percent={Math.round(healthPercent)}
                        size="small"
                        status={healthPercent > 80 ? 'success' : healthPercent > 60 ? 'normal' : 'exception'}
                      />
                    );
                  },
                },
              ]}
            />
          ) : (
            <Empty description="No category data available" />
          )}
        </Card>

        {/* Stock Movement */}
        <Card title="Stock Movement (Last 30 Days)">
          {movements.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={movements.map(m => ({
                category: m.category || 'Uncategorized',
                received: parseFloat(m.received) || 0,
                sold: parseFloat(m.sold) || 0,
                adjusted: parseFloat(m.adjusted) || 0,
              }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="received" fill="#22c55e" name="Received" />
                <Bar dataKey="sold" fill="#3b82f6" name="Sold" />
                <Bar dataKey="adjusted" fill="#ef4444" name="Adjusted" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Empty description="No movement data available" />
          )}
        </Card>
      </div>
    );
  };

  const SupplierReport = () => {
    if (!supplierData) return <Empty description="No supplier data available" />;

    const summary = supplierData.summary || {};
    const suppliers = supplierData.suppliers || [];
    const poTrend = supplierData.po_trend || [];

    // Calculate totals from suppliers
    const totalPOValue = suppliers.reduce((sum, s) => sum + parseFloat(s.total_value || 0), 0);
    const totalOrders = suppliers.reduce((sum, s) => sum + parseInt(s.total_orders || 0), 0);

    return (
      <div className="space-y-6">
        {/* Summary */}
        <Row gutter={[16, 16]}>
          <Col xs={12} md={6}>
            <Card>
              <Statistic title="Total Suppliers" value={parseInt(summary.total_suppliers) || 0} />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card>
              <Statistic title="Active Suppliers" value={parseInt(summary.active_suppliers) || 0} />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card>
              <Statistic
                title="Total PO Value"
                value={totalPOValue}
                prefix="₹"
                valueStyle={{ color: '#3b82f6' }}
              />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card>
              <Statistic
                title="Total Orders"
                value={totalOrders}
              />
            </Card>
          </Col>
        </Row>

        {/* Supplier Table */}
        <Card title="Supplier Performance">
          {suppliers.length > 0 ? (
            <Table
              dataSource={suppliers}
              rowKey="id"
              pagination={false}
              columns={[
                {
                  title: 'Supplier',
                  dataIndex: 'name',
                  key: 'name',
                },
                {
                  title: 'Total Orders',
                  dataIndex: 'total_orders',
                  key: 'orders',
                },
                {
                  title: 'Total Value',
                  dataIndex: 'total_value',
                  key: 'value',
                  render: (val) => `₹${parseFloat(val || 0).toLocaleString()}`,
                },
                {
                  title: 'Completed',
                  dataIndex: 'completed_orders',
                  key: 'completed',
                  render: (val) => <Tag color="green">{val}</Tag>,
                },
                {
                  title: 'Pending',
                  dataIndex: 'pending_orders',
                  key: 'pending',
                  render: (val) => <Tag color={val > 0 ? 'orange' : 'default'}>{val}</Tag>,
                },
              ]}
            />
          ) : (
            <Empty description="No supplier data available" />
          )}
        </Card>

        {/* Purchase Trend */}
        <Card title="Purchase Order Trend (Last 6 Months)">
          {poTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={poTrend.map(item => ({
                month: item.month,
                value: parseFloat(item.value) || 0,
                orders: parseInt(item.orders) || 0,
              }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="value" stroke="#ed751a" name="PO Value (₹)" />
                <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#3b82f6" name="Number of POs" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <Empty description="No PO trend data available" />
          )}
        </Card>
      </div>
    );
  };

  const ProfitLossReport = () => {
    if (!profitLossData) return <Empty description="No profit/loss data available" />;

    const revenue = parseFloat(profitLossData.revenue) || 0;
    const cogs = parseFloat(profitLossData.cogs) || 0;
    const grossProfit = parseFloat(profitLossData.gross_profit) || 0;
    const profitMargin = parseFloat(profitLossData.profit_margin) || 0;

    // Calculate category profits from categoryData
    const categoryProfits = categoryData.map(cat => {
      const catRevenue = parseFloat(cat.revenue) || 0;
      // Estimate COGS as 70% of revenue for visualization (adjust as needed)
      const estimatedCogs = catRevenue * 0.7;
      const profit = catRevenue - estimatedCogs;
      return {
        category: cat.name || 'Uncategorized',
        revenue: catRevenue,
        cost: estimatedCogs,
        profit: profit,
      };
    });

    return (
      <div className="space-y-6">
        {/* Summary */}
        <Row gutter={[16, 16]}>
          <Col xs={12} md={6}>
            <Card>
              <Statistic
                title="Gross Revenue"
                value={revenue}
                prefix="₹"
              />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card>
              <Statistic
                title="Cost of Goods"
                value={cogs}
                prefix="₹"
                valueStyle={{ color: '#ef4444' }}
              />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card>
              <Statistic
                title="Gross Profit"
                value={grossProfit}
                prefix="₹"
                valueStyle={{ color: '#22c55e' }}
              />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card>
              <Statistic
                title="Profit Margin"
                value={profitMargin}
                suffix="%"
                valueStyle={{ color: profitMargin > 0 ? '#22c55e' : '#ef4444' }}
              />
            </Card>
          </Col>
        </Row>

        {/* P&L Chart */}
        <Card title="Revenue vs Profit">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={[
              { name: 'Revenue', value: revenue },
              { name: 'COGS', value: cogs },
              { name: 'Gross Profit', value: grossProfit },
            ]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => `₹${parseFloat(value).toLocaleString()}`} />
              <Bar dataKey="value" fill="#3b82f6">
                <Cell fill="#3b82f6" />
                <Cell fill="#ef4444" />
                <Cell fill="#22c55e" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Profit by Category */}
        {categoryProfits.length > 0 && (
          <Card title="Estimated Profit by Category">
            <div className="space-y-4">
              {categoryProfits.map(item => (
                <div key={item.category} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">{item.category}</span>
                    <span className="text-green-600 font-bold">₹{item.profit.toLocaleString()}</span>
                  </div>
                  <div className="flex gap-4 text-sm text-gray-500">
                    <span>Revenue: ₹{item.revenue.toLocaleString()}</span>
                    <span>Est. Cost: ₹{item.cost.toLocaleString()}</span>
                    <span>Margin: {item.revenue > 0 ? ((item.profit / item.revenue) * 100).toFixed(1) : 0}%</span>
                  </div>
                  <Progress
                    percent={item.revenue > 0 ? (item.profit / item.revenue) * 100 : 0}
                    strokeColor="#22c55e"
                    showInfo={false}
                    className="mt-2"
                  />
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    );
  };

  const tabItems = [
    { key: 'sales', label: 'Sales Report', children: <SalesReport /> },
    { key: 'inventory', label: 'Inventory Report', children: <InventoryReport /> },
    { key: 'supplier', label: 'Supplier Report', children: <SupplierReport /> },
    { key: 'profit', label: 'Profit & Loss', children: <ProfitLossReport /> },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="page-title">Reports & Analytics</h1>
          <p className="page-subtitle">Comprehensive business insights and reports</p>
        </div>
        <Space wrap>
          <RangePicker
            value={dateRange}
            onChange={handleDateChange}
          />
          <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={loading}>
            Refresh
          </Button>
          <Button icon={<FileExcelOutlined />} onClick={exportToExcel}>Export Excel</Button>
          <Button type="primary" icon={<FilePdfOutlined />} onClick={exportToPDF}>Export PDF</Button>
        </Space>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Spin size="large" tip="Loading reports..." />
        </div>
      ) : (
        <Card>
          <Tabs
            activeKey={reportType}
            onChange={setReportType}
            items={tabItems}
          />
        </Card>
      )}
    </div>
  );
}
