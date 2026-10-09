function Pagination({ page, totalPages, loadingMetrics, setPage }) {
  return (
    <>
          <div className="pagination-container">


            <button
              type="button"
              disabled={
                page <= 1 ||
                loadingMetrics
              }
              onClick={() =>
                setPage(
                  (current) =>
                    current - 1
                )
              }
            >

              ← Previous

            </button>


            <span>

              Page{" "}

              <strong>
                {page}
              </strong>

              {" "}of{" "}

              <strong>
                {totalPages}
              </strong>

            </span>


            <button
              type="button"
              disabled={
                page >= totalPages ||
                loadingMetrics
              }
              onClick={() =>
                setPage(
                  (current) =>
                    current + 1
                )
              }
            >

              Next →

            </button>

          </div>
    </>
  );
}

export default Pagination;
