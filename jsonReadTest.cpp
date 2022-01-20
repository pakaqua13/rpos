#include <stdio.h>
#include "./cppheader/parson.h"    

int main()
{
    JSON_Value *rootValue;
    JSON_Object *rootObject;

    rootValue = json_parse_file("pm.json");     
    rootObject = json_value_get_object(rootValue);    
    
    // printf("Title: %s\n", json_object_get_array(rootObject, "pm.pm0"));

    // printf("Year: %d\n", (int)json_object_get_number(rootObject, "Year"));
    // printf("Runtime %d\n", (int)json_object_get_number(rootObject, "Runtime"));

    // printf("Genre: %s\n", json_object_get_string(rootObject, "Genre"));
    // printf("Director: %s\n", json_object_get_string(rootObject, "Director"));

    // printf("Actors:\n");
    
    JSON_Array *array = json_object_get_array(rootObject, "pm0");
    // size_t x = json_array_get_count(array);
    // printf("%d\n", x);
    printf("  %s\n", "pm0");
    for (int i = 0; i < json_array_get_count(array); i++) 
    {
        printf("  %s\n", json_array_get_string(array, i));
    }

    printf("  %s\n", "pm1");
    JSON_Array *array2 = json_object_get_array(rootObject, "pm1");
    for (int i = 0; i < json_array_get_count(array2); i++) 
    {
        printf("  %s\n", json_array_get_string(array2, i));
    }

    printf("  %s\n", "pm2");
    JSON_Array *array3 = json_object_get_array(rootObject, "pm2");
    for (int i = 0; i < json_array_get_count(array3); i++) 
    {
        printf("  %s\n", json_array_get_string(array3, i));
    }

    printf("  %s\n", "pm3");
    JSON_Array *array4 = json_object_get_array(rootObject, "pm3");
    for (int i = 0; i < json_array_get_count(array4); i++) 
    {
        printf("  %s\n", json_array_get_string(array4, i));
    }
    // printf("imdbRating: %f\n", json_object_get_number(rootObject, "imdbRating"));

    // printf("KoreaRelease: %d\n", json_object_get_boolean(rootObject, "KoreaRelease"));

    json_value_free(rootValue);   

    return 0;
}
