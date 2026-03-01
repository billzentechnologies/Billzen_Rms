import React, { useState, useEffect } from 'react';
import { getSubCategories } from '../services/apicall';

const Sidebar = ({ selectedSubCategory, setSelectedSubCategory }) => {
  const [subCategories, setSubCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ✅ Fetch subcategories only once on mount
  useEffect(() => {
    const fetchSubCategories = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log("Fetching subcategories (should happen only once)...");
        
        const subCategoriesResponse = await getSubCategories();
        const subCategoriesData = Array.isArray(subCategoriesResponse) 
          ? subCategoriesResponse 
          : subCategoriesResponse?.data || subCategoriesResponse || [];
        
        // Filter only active subcategories
        const activeSubCategories = subCategoriesData.filter(sc => sc.isActive !== false);
        setSubCategories(activeSubCategories);
        
        console.log("Subcategories loaded:", activeSubCategories);
        
      } catch (err) {
        console.error("Failed to fetch subcategories:", err);
        setError("Failed to load categories");
      } finally {
        setLoading(false);
      }
    };

    fetchSubCategories();
  }, []);

  // ✅ Auto-select first subcategory
  useEffect(() => {
    if (!selectedSubCategory && subCategories.length > 0) {
      console.log("Auto-selecting first subcategory:", subCategories[0].subcategoryName);
      setSelectedSubCategory(subCategories[0].subcategoryName);
    }
  }, [subCategories, selectedSubCategory, setSelectedSubCategory]);

  if (loading) {
    return (
      <div className="w-48 bg-gray-800 text-white h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
          <div className="text-xs text-gray-300">Loading categories...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-48 bg-gray-800 text-white h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="text-center text-red-400 p-4">
          <div className="text-2xl mb-2">⚠️</div>
          <div className="text-xs">{error}</div>
          <button 
            onClick={() => window.location.reload()}
            className="mt-2 px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="w-48 bg-gray-800 text-white h-[calc(100vh-64px)] overflow-y-auto"
      style={{
        scrollbarWidth: 'none', /* Firefox */
        msOverflowStyle: 'none', /* IE and Edge */
      }}
    >
      {/* Hide scrollbar for Chrome, Safari and Opera */}
      <style jsx>{`
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* Subcategories List */}
      <div className="pb-4">
        {subCategories.map((subCategory) => (
          <div
            key={subCategory.subcategoryId}
            className={`px-4 py-3 cursor-pointer border-b border-gray-700 text-sm transition-colors ${
              selectedSubCategory === subCategory.subcategoryName 
                ? 'bg-blue-600 text-white' 
                : 'hover:bg-gray-700 text-gray-200 hover:text-white'
            }`}
            onClick={() => {
              console.log("Selected subcategory:", subCategory.subcategoryName);
              setSelectedSubCategory(subCategory.subcategoryName);
            }}
          >
            <div className="font-medium">{subCategory.subcategoryName}</div>
          </div>
        ))}
      </div>

      {/* Show message if no categories */}
      {subCategories.length === 0 && (
        <div className="px-4 py-8 text-center text-gray-400">
          <div className="text-2xl mb-2">📂</div>
          <div className="text-xs">No categories available</div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;