'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Specification page component
const SpecificationsPage = () => {
  const supabase = createClientComponentClient();
  const [products, setProducts] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [specifications, setSpecifications] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [materialQuantities, setMaterialQuantities] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [viewMaterialsProductId, setViewMaterialsProductId] = useState(null); // Store the selected product ID for materials view
  const [isEditModalOpen, setIsEditModalOpen] = useState(false); // Edit modal state
  const [editMaterial, setEditMaterial] = useState(null); // Material to be edited

  // Fetch data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: materialsData, error: materialsError } = await supabase.from('materials').select('*');
        if (materialsError) throw materialsError;

        const { data: productsData, error: productsError } = await supabase.from('product').select('*');
        if (productsError) throw productsError;

        const { data: specificationsData, error: specificationsError } = await supabase
          .from('products_materials')
          .select('*, product(*), materials(*)');
        if (specificationsError) throw specificationsError;

        setMaterials(materialsData || []);
        setProducts(productsData || []);
        setSpecifications(specificationsData || []);

        console.log('Materials:', materialsData);
        console.log('Products:', productsData);
        console.log('Specifications:', specificationsData);
      } catch (err) {
        setError('Error fetching data from the database.');
        console.error('Error:', err);
      }
    };

    fetchData();
  }, []);

  // Handle adding a new specification
  const handleAddSpecification = async () => {
    try {
      // Debugging: Log the material quantities
      console.log("Material quantities:", materialQuantities);
      console.log("Selected product:", selectedProduct);
  
      // Map the material quantities to the required structure
      const materialsToInsert = Object.entries(materialQuantities).map(([materialId, quantity]) => ({
        product_id: selectedProduct,
        material_id: materialId,
        quantity_required: parseFloat(quantity as string),
      }));
  
      // Debugging: Log the materials to insert
      console.log("Materials to insert:", materialsToInsert);
  
      // Insert the materials
      const { error: insertError } = await supabase.from('products_materials').insert(materialsToInsert);
  
      // If there's an error during insertion, throw the error
      if (insertError) {
        console.error("Insert error:", insertError);
        throw insertError;
      }
  
      alert('Specification added successfully.');
      setIsModalOpen(false);
    } catch (err) {
      setError('Error adding specification.');
      console.error('Error:', err);
    }
  };
  
  // Handle the "View Materials" button click
  const handleViewMaterials = (productId) => {
    setViewMaterialsProductId(productId);
  };

  // Close the "View Materials" popup
  const closeViewMaterialsPopup = () => {
    setViewMaterialsProductId(null);
  };

  // Open the Edit Material Modal
  const openEditMaterialModal = (material) => {
    setEditMaterial(material);
    setIsEditModalOpen(true);
  };

  // Close the Edit Material Modal
  const closeEditMaterialModal = () => {
    setIsEditModalOpen(false);
    setEditMaterial(null);
  };

  // Update material quantity
  const handleUpdateMaterial = async () => {
    try {
      const { error } = await supabase
        .from('products_materials')
        .update({ quantity_required: parseFloat(editMaterial?.quantity_required || '') })
        .match({ product_id: editMaterial?.product_id, material_id: editMaterial?.material_id });

      if (error) throw error;

      alert('Material updated successfully.');
      closeEditMaterialModal();
    } catch (err) {
      setError('Error updating material.');
      console.error('Error:', err);
    }
  };

  // Delete material from the product specification
  const handleDeleteByProduct = async (productId) => {
    try {
      // Ensure that a product is selected and the product ID is valid
      if (!productId || isNaN(Number(productId))) {
        setError('Please select a valid product.');
        return;
      }
  
      console.log('Deleting materials for Product ID:', productId);
  
      const { data, error } = await supabase
        .from('products_materials')
        .delete()
        .match({ product_id: productId });
  
      if (error) throw error;
  
      alert('All materials for the selected product deleted successfully.');
    } catch (err) {
      setError('Error deleting materials for the selected product.');
      console.error('Error:', err);
    }
  };
  

  return (
    <div className="p-4">
      {/* Lifted Card for the Heading */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h1 className='text-3xl font-bold mb-6 text-center shadow-lg p-4 rounded-lg bg-blue-100 dark:bg-gray-800 dark:text-white'>Product content Specifications</h1>
      </div>

      {/* Add Specification Button */}
      <button
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 float-right mb-6"
        onClick={() => setIsModalOpen(true)}
      >
        Add Specification
      </button>

      {/* Lifted Card for the Table */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <table className="min-w-full border-collapse">
          <thead>
            <tr>
              <th className="border border-gray-300 p-2 text-left bg-gray-100">Product</th>
              <th className="border border-gray-300 p-2 text-left bg-gray-100">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const productSpecs = specifications.filter((spec) => spec.product_id === product.id);
              return (
                <>
                  {productSpecs.map((spec, index) => (
                    <tr key={spec.id}>
                      {index === 0 && (
                        <td className="border border-gray-300 p-2" rowSpan={productSpecs.length} style={{ width: '150px' }}>
                          {product.title}
                        </td>
                      )}
                      {index === 0 && (
                        <td className="border border-gray-300 p-2" rowSpan={productSpecs.length} style={{ width: '200px' }}>
                          <button
                            className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
                            onClick={() => handleViewMaterials(product.id)}
                          >
                            View Materials
                          </button>
                          <button
                            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 mt-2"
                            onClick={() => openEditMaterialModal(spec)}
                          >
                            Edit
                          </button>
                          <button
                            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 mt-2"
                            onClick={() => handleDeleteByProduct(product.id)}
                          >
                            Delete
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Error Display */}
      {error && <p className="text-red-500 mt-4">{error}</p>}

      {/* Modal Form for Adding Specification */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-96">
            <h2 className="text-xl font-bold mb-4">Add Specification</h2>

            {/* Product Dropdown */}
            <label htmlFor="product" className="block mb-2">Product</label>
            <select
              id="product"
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="border border-gray-300 p-2 rounded w-full mb-4 text-gray-900"
            >
              <option value="">Select a product</option>
              {products.map((product) => (
                <option key={product.id} value={product.id} className="text-gray-900">
                  {product.title}
                </option>
              ))}
            </select>

            {/* Material Rows with Input Fields */}
            {materials.map((material) => (
              <div key={material.id} className="flex items-center space-x-4 mb-2">
                <label className="flex-1">{material.name}</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Enter quantity"
                  value={materialQuantities[material.id] || ''}
                  onChange={(e) =>
                    setMaterialQuantities({
                      ...materialQuantities,
                      [material.id]: e.target.value,
                    })
                  }
                  className="border border-gray-300 p-2 rounded w-24"
                />
              </div>
            ))}

            {/* Buttons */}
            <div className="flex justify-end space-x-4 mt-4">
              <button
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                onClick={handleAddSpecification}
              >
                Save
              </button>
              <button
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Material Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-96">
            <h2 className="text-xl font-bold mb-4">Edit Material</h2>

            <label className="block mb-2">Material: {editMaterial?.materials?.name}</label>
            <input
              type="number"
              min="0"
              step="any"
              value={editMaterial?.quantity_required || ''}
              onChange={(e) => setEditMaterial({ ...editMaterial, quantity_required: e.target.value })}
              className="border border-gray-300 p-2 rounded w-full mb-4"
            />

            <div className="flex justify-end space-x-4 mt-4">
              <button
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                onClick={handleUpdateMaterial}
              >
                Update
              </button>
              <button
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                onClick={closeEditMaterialModal}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Materials Popup */}
      {viewMaterialsProductId && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-96">
            <h2 className="text-xl font-bold mb-4">Materials for Product </h2>
            <table className="min-w-full border-collapse border border-gray-300">
              <thead>
                <tr>
                  <th className="border border-gray-300 p-2">Material</th>
                  <th className="border border-gray-300 p-2">Quantity</th>
                </tr>
              </thead>
              <tbody>
                {specifications
                  .filter((spec) => spec.product_id === viewMaterialsProductId)
                  .map((spec) => (
                    <tr key={spec.id}>
                      <td className="border border-gray-300 p-2">{spec.materials?.name}</td>
                      <td className="border border-gray-300 p-2">{spec.quantity_required}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
            <div className="flex justify-end space-x-4 mt-4">
              <button
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                onClick={closeViewMaterialsPopup}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpecificationsPage;