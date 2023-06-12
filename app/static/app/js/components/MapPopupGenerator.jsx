const mapPopupGenerator = (
  categories,
  deleteSelectedCategory,
  editSelectedCategory,
  saveSelectedCategory
) => {
  const form = document.createElement("form");

  const message = document.createElement("p");
  message.textContent = "Please select a category to save.";
  message.classList.add("error-message");
  form.appendChild(message);

  const categoryGroup = document.createElement("div");

  const dropdown = document.createElement("select");
  dropdown.name = "selectedCategory";

  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category.id;
    option.textContent = category.name;
    dropdown.appendChild(option);
  });

  categoryGroup.appendChild(dropdown);

  form.appendChild(categoryGroup);

  const line = document.createElement("hr");

  const saveButton = document.createElement("button");
  saveButton.textContent = "Save";
  saveButton.type = "submit";

  const deleteButton = document.createElement("button");
  deleteButton.textContent = "Delete";
  deleteButton.type = "button";
  deleteButton.addEventListener("click", deleteSelectedCategory);

  const editButton = document.createElement("button");
  editButton.textContent = "Edit";
  editButton.type = "button";
  editButton.addEventListener("click", editSelectedCategory);

  form.appendChild(line);
  form.appendChild(saveButton);
  form.appendChild(deleteButton);
  form.appendChild(editButton);

  form.addEventListener("submit", saveSelectedCategory);

  return form;
};

export default mapPopupGenerator;
