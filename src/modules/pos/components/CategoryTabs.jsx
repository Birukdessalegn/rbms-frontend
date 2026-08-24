
const categories = [
  { id: "all", name: "All" },
  { id: "food", name: "Food" },
  { id: "drinks", name: "Drinks" },
  { id: "bar", name: "Bar" },
  { id: "desserts", name: "Desserts" },
  { id: "specials", name: "Specials" },
];

function CategoryTabs({ activeCategory = "all", onSelectCategory }) {
  return (
    <div>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map((category) => {
          const isActive = activeCategory === category.id;

          return (
            <button
              key={category.id}
              onClick={() => onSelectCategory && onSelectCategory(category.id)}
              className={`whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-medium transition ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {category.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default CategoryTabs;