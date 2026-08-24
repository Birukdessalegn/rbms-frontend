import ProductCard from "./ProductCard";

const products = [
  {
    id: 1,
    name: "Classic Burger",
    category: "Food",
    price: 350,
    image: "🍔",
  },
  {
    id: 2,
    name: "Cheese Pizza",
    category: "Food",
    price: 500,
    image: "🍕",
  },
  {
    id: 3,
    name: "Chicken Pasta",
    category: "Food",
    price: 450,
    image: "🍝",
  },
  {
    id: 4,
    name: "Grilled Steak",
    category: "Food",
    price: 850,
    image: "🥩",
  },
  {
    id: 5,
    name: "French Fries",
    category: "Food",
    price: 180,
    image: "🍟",
  },
  {
    id: 6,
    name: "Fresh Juice",
    category: "Drinks",
    price: 150,
    image: "🧃",
  },
  {
    id: 7,
    name: "Mojito",
    category: "Bar",
    price: 500,
    image: "🍹",
  },
  {
    id: 8,
    name: "Beer",
    category: "Bar",
    price: 250,
    image: "🍺",
  },
];

function ProductGrid({ onAddProduct }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onAdd={onAddProduct}
        />
      ))}
    </div>
  );
}

export default ProductGrid;