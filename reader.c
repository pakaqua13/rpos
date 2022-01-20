#include <stdio.h>      // printf()
#include <unistd.h>     // sleep()
#include <sys/ipc.h>
#include <sys/shm.h>
#include <sys/types.h>

#define WIDTH  640
#define HEIGHT 480

#define KEY_NUM 654321
#define MEM_SIZE WIDTH*HEIGHT

int main( void){
   int   shm_id;
   void *shm_addr;

   if ( -1 == ( shm_id = shmget( (key_t)KEY_NUM, MEM_SIZE, IPC_CREAT | 0666)))
   {
      printf( "공유 메모리 생성 실패\n");
      return -1;
   }

    if ( ( void *)-1 == ( shm_addr = shmat( shm_id, ( void *)0, 0))){
        printf( "공유 메모리 첨부 실패\n");
        return -1;
    }

    printf("start address of shared memory : %p\n", shm_addr);

   while( 1 ){


      printf( "Data read from shared mem :   %s\n", (size_t *)shm_addr);

      /*
      if ( -1 == shmdt( shm_addr)){
         printf( "공유 메모리 분리 실패\n");
         return -1;
      }
      */
      sleep( 1);
   }
   return 0;
}