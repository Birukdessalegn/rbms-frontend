function StatCard({ title, value, description }) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
      <p className="text-sm font-medium text-gray-500">
        {title}
      </p>

      <h3 className="mt-2 text-2xl font-bold text-gray-900">
        {value}
      </h3>

      <p className="mt-1 text-sm text-gray-400">
        {description}
      </p>
    </div>
  );
}

export default StatCard;