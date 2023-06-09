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

  categories.forEach((category) => {
    const label = document.createElement("label");
    label.textContent = category.category;

    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "selectedCategory";
    radio.value = category.id;

    label.appendChild(radio);
    categoryGroup.appendChild(label);
    categoryGroup.appendChild(document.createElement("br"));
  });

  form.appendChild(categoryGroup);

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

  form.appendChild(saveButton);
  form.appendChild(deleteButton);
  form.appendChild(editButton);

  form.addEventListener("submit", saveSelectedCategory);

  return form;
};

export default mapPopupGenerator;
