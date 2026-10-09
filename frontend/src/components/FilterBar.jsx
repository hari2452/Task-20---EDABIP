function FilterBar({
  department,
  setDepartment,
  fromDate,
  setFromDate,
  toDate,
  setToDate,
  onApply,
  onClear,
  loading = false,
}) {
  return (
    <section className="filter-card">
      {/* DEPARTMENT FILTER */}
      <select
        value={department}
        onChange={(e) => setDepartment(e.target.value)}
      >
        <option value="">All Departments</option>
        <option value="Sales">Sales</option>
        <option value="Marketing">Marketing</option>
        <option value="HR">HR</option>
        <option value="Finance">Finance</option>
        <option value="Operations">Operations</option>
      </select>

      {/* FROM DATE */}
      <input
        type="date"
        value={fromDate}
        onChange={(e) => setFromDate(e.target.value)}
        title="From Date"
      />

      {/* TO DATE */}
      <input
        type="date"
        value={toDate}
        onChange={(e) => setToDate(e.target.value)}
        title="To Date"
      />

      {/* APPLY FILTERS */}
      <button
        type="button"
        onClick={onApply}
        disabled={loading}
      >
        {loading ? "Loading..." : "Apply Filters"}
      </button>

      {/* CLEAR FILTERS */}
      <button
        type="button"
        onClick={onClear}
        disabled={loading}
        className="clear-filter-btn"
      >
        Clear
      </button>
    </section>
  );
}

export default FilterBar;